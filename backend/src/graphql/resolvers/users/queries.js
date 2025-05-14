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