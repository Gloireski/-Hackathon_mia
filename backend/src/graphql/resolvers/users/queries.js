const { User } = require('../../../models/users')
const { Tweet } = require('../../../models/tweets')
const { Comment } = require('../../../models/comments')
const { verifyToken } = require('../../../utils/auth')

const userQueries = {
  getCurrentUser: async (_, __, { req }) => {
    const user = await verifyToken(req)
    if (!user) throw new Error("Non authentifié");
    return user;
  },

  getSuggestedProfiles: async (_, __, { req }) => {
    const currentUser = await verifyToken(req);
    if (!currentUser) throw new Error("Authentication required");

    try {
      // Get the current user's data with their followings
      const user = await User.findById(currentUser.id).select("followings");
      if (!user) throw new Error("User not found");

      // Get users that the current user's followings follow (followers of followings)
      const followingsFollowings = await User.find({
        followers: { $in: user.followings },
        _id: { $ne: currentUser.id, $nin: user.followings }
      }).select("_id followers username handle profile_img");

      // Get users with similar interests (based on tweet hashtags)
      const userTweets = await Tweet.find({ author: currentUser.id }).select("hashtags");
      const userHashtags = [...new Set(userTweets.flatMap(tweet => tweet.hashtags || []))];
      
      const similarInterestUsers = await Tweet.aggregate([
        { $match: { hashtags: { $in: userHashtags } } },
        { $group: { _id: "$author", commonHashtags: { $sum: 1 } } },
        { $sort: { commonHashtags: -1 } },
        { $limit: 10 }
      ]);

      const similarUsersIds = similarInterestUsers.map(u => u._id);
      const similarUsers = await User.find({
        _id: { 
          $in: similarUsersIds,
          $ne: currentUser.id,
          $nin: user.followings
        }
      }).select("_id followers username handle profile_img");

      // Combine and process all suggested users
      const allSuggestions = [...followingsFollowings, ...similarUsers];
      const uniqueSuggestions = Array.from(new Map(
        allSuggestions.map(user => [user._id.toString(), user])
      ).values());

      // Calculate mutual followers for each suggestion
      const suggestedProfiles = await Promise.all(
        uniqueSuggestions.map(async (suggestedUser) => {
          const mutualFollowers = suggestedUser.followers.filter(
            followerId => user.followings.includes(followerId.toString())
          ).length;

          return {
            user: {
              _id: suggestedUser._id,
              username: suggestedUser.username,
              handle: suggestedUser.handle,
              profile_img: suggestedUser.profile_img
            },
            mutualFollowers,
            isFollowing: false
          };
        })
      );

      // Sort by number of mutual followers and limit to 10 suggestions
      return suggestedProfiles
        .sort((a, b) => b.mutualFollowers - a.mutualFollowers)
        .slice(0, 10);

    } catch (error) {
      console.error("Error fetching suggested profiles:", error);
      throw new Error("Failed to fetch suggested profiles");
    }
  },

  userTimeline: async (_, __, { req }) => {
    const user = await verifyToken(req);
    if (!user) throw new Error("Authentification requise");
  
    try {
      const authenticatedUser = await User.findById(user.id).populate("bookmarks").exec();
      if (!authenticatedUser) throw new Error("User not found")
  
      const userData = await User.findById(user.id);
      if (!userData) throw new Error("Utilisateur introuvable")

      const tweets = await Tweet.find({ author: user.id })
        .populate("author", "username profile_img")
        .populate("comments")
        .exec();
  
      const comments = await Comment.find({ author: user.id })
        .populate("tweet", "content author")
        .exec();
  
      const likedTweets = await Tweet.find({ likes: user.id })
        .populate("author", "username profile_img")
        .exec();
  
      const formatTimelineResponse = (tweet) => ({
        id: tweet.id,
        content: tweet.content,
        media: tweet.media,
        createdAt: tweet.createdAt.toISOString(),
        likes: tweet.likes.length,
        retweets: tweet.retweets.length,
        isRetweet: tweet.isRetweet,
        isLiked: tweet.likes.includes(user.id),
        isRetweeted: tweet.retweets.includes(user.id),
        isFollowing: user.followings.includes(tweet.author._id.toString()),
        author: tweet.author ? {
            ...tweet.author._doc,
            id: tweet.author._id.toString()
        } : null,
        comments: tweet.comments.map((comment) => ({
            ...comment._doc,})),
      });
  
      return {
        user: userData,
        tweets: tweets.map(formatTimelineResponse),
        comments: comments
        .filter(comment => comment.tweet)
        .map(comment => ({
            ...comment._doc,
            id: comment._id.toString(),
            tweetId: comment.tweet ? comment.tweet._id.toString() : null,
        })),
        likedTweets: likedTweets.map(formatTimelineResponse),
        bookmarks: authenticatedUser.bookmarks.map(formatTimelineResponse),
        followingUsers: userData.followings.map((user) => ({id: user._id.toString()})),
      };
    } catch (error) {
      console.error("Error fetching user timeline:", error);
      throw new Error("Internal Server Error");
    }
  },
}

module.exports = userQueries 