const { Tweet } = require('../../../models/tweets')
const { User } = require('../../../models/users')
const { Like } = require('../../../models/likes')
const { verifyToken } = require('../../../utils/auth')
const redis = require('../../../config/redis')
const esClient = require('../../../utils/elasticsearchClient')

const tweetQueries = {
  publicTimeline: async () => {
    try {
      const tweets = await Tweet.find({})
        .populate("author", "username profile_img handle")
        .sort({ createdAt: -1 });

      return tweets.map((tweet) => ({
        id: tweet._id,
        content: tweet.content,
        media: tweet.media,
        createdAt: tweet.createdAt.toISOString(),
        likes: tweet.likes.length,
        retweets: tweet.retweets.length,
        isRetweet: tweet.isRetweet,
        isLiked: false,
        isRetweeted: false,
        isFollowing: false,
        author: {
          _id: tweet.author._id,
          username: tweet.author.username,
          handle: tweet.author.handle,
          profile_img: tweet.author.profile_img,
        },
        comments: tweet.comments.map((comment) => comment._id),
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des tweets:", error);
      throw new Error("Impossible de récupérer les tweets.");
    }
  },

  getTimeline: async (_, __, { req }) => {
    const currentUser = await verifyToken(req);
    if (!currentUser) throw new Error("Authentification requise");
    const cacheKey = `timeline:${currentUser.id}`;
    const cachedTimeline = await redis.get(cacheKey);
  
    if (cachedTimeline) {
      console.log("Serving from Redis cache");
      return JSON.parse(cachedTimeline);
    }
  
    const user = await User.findById(currentUser.id).select("followings bookmarks");
    if (!user) throw new Error("Utilisateur introuvable");

    let timelineTweets = [];

    // If user is not following anyone, get recent and popular tweets
    if (user.followings.length === 0) {
      // Get recent tweets
      const recentTweets = await Tweet.find({})
        .populate("author", "username handle profile_img")
        .sort({ createdAt: -1 })
        .limit(20);

      // Get popular tweets based on engagement (likes + retweets)
      const popularTweets = await Tweet.aggregate([
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $size: { $ifNull: ["$likes", []] } },
                { $size: { $ifNull: ["$retweets", []] } }
              ]
            }
          }
        },
        { $sort: { engagementScore: -1 } },
        { $limit: 20 }
      ]);

      const populatedPopularTweets = await Tweet.populate(popularTweets, {
        path: "author",
        select: "username handle profile_img"
      });

      timelineTweets = [...recentTweets, ...populatedPopularTweets];
    } else {
      // Original logic for users with followings
      const followedTweets = await Tweet.find({ author: { $in: user.followings } })
        .populate("author", "username handle profile_img")
        .sort({ createdAt: -1 })
        .limit(50);
    
      const likedAndRetweetedTweets = await Like.find({ user: currentUser.id })
        .populate({
          path: "tweet",
          populate: { path: "author", select: "username handle profile_img" },
        })
        .sort({ createdAt: -1 })
        .limit(50);
    
      const trendingHashtags = await Tweet.aggregate([
        { $unwind: "$hashtags" },
        { $group: { _id: "$hashtags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);
    
      const tweetsWithTrendingHashtags = await Tweet.find({
        hashtags: { $in: trendingHashtags.map((tag) => tag._id) },
      })
        .populate("author", "username handle profile_img")
        .sort({ engagementScore: -1 })
        .limit(50);
      
      const ownTweets = await Tweet.find({ author: currentUser.id })
        .populate("author", "username handle profile_img")
        .sort({ createdAt: -1 })
        .limit(50);

      timelineTweets = [
        ...ownTweets,
        ...followedTweets,
        ...likedAndRetweetedTweets.map((like) => like.tweet),
        ...tweetsWithTrendingHashtags,
      ];
    }
  
    // Éliminer les doublons
    const uniqueTweets = Array.from(
      new Map(
        timelineTweets
          .filter(tweet => tweet && tweet._id)
          .map((tweet) => [tweet._id.toString(), tweet])
      ).values()
    );
  
    const retweetedIds = await Tweet.find({
      author: currentUser.id,
      isRetweet: true,
      originalTweet: { $in: uniqueTweets.map((tweet) => tweet._id.toString()) },
    }).distinct("originalTweet");
  
    const finalTweets = uniqueTweets.map((tweet) => ({
      id: tweet._id,
      content: tweet.content,
      media: tweet.media,
      createdAt: tweet.createdAt.toISOString(),
      likes: Array.isArray(tweet.likes) ? tweet.likes.length : 0,
      retweets: Array.isArray(tweet.retweets) ? tweet.retweets.length : 0,
      isRetweet: tweet.isRetweet,
      isLiked: Array.isArray(tweet.likes) && tweet.likes.some((like) => like.toString() === currentUser.id),
      isRetweeted: retweetedIds.some(id => id.toString() === tweet._id.toString()),
      isFollowing: user.followings.includes(tweet.author._id.toString()),
      author: {
        _id: tweet.author._id,
        username: tweet.author.username,
        handle: tweet.author.handle,
        profile_img: tweet.author.profile_img,
      },
      comments: tweet.comments,
    })).sort((a, b) => b.likes + b.retweets - (a.likes + a.retweets));
  
    await redis.setex(cacheKey, 20, JSON.stringify(finalTweets));
    return {
      tweets: finalTweets,
      followingUsers: user.followings.map((user) => ( user._id?.toString?.() || user.id?.toString?.() )),
    };
  },

  getUserTweets: async(_, { userId }) => {
    try {
      const tweets = await Tweet.find({ author: userId }).populate("author");
      return tweets;
    } catch (error) {
      throw new Error("Erreur lors de la récupération des tweets.");
    }
  },

  getTweet: async (_, { id }) => {
    const cachedTweet = await redis.get(`tweet:${id}`);
    if (cachedTweet) {
      console.log("🟢 Récupéré depuis Redis");
      return JSON.parse(cachedTweet);
    }
  
    const tweet = await Tweet.findById(id)
      .populate("author", "username handle profile_img")
      .populate({
        path: "comments",
        populate: { path: "author", select: "username handle profile_img" }
      });
  
    if (!tweet) throw new Error("Tweet non trouvé");
  
    await redis.set(`tweet:${id}`, JSON.stringify(tweet), "EX", 600);
  
    console.log("🔴 Récupéré depuis MongoDB");
    return tweet;
  },

  searchTweets: async (_, { query }) => {
    const cachedResults = await redis.get(`search:${query}`)
    if (cachedResults) {
      console.log("🟢 Résultats récupérés depuis Redis")
      return JSON.parse(cachedResults);
    }

    const { hits } = await esClient.search({
      index: "tweets",
      body: { query: { match: { content: query } } },
    })

    const results = hits.hits.map((hit) => hit._source);
    await redis.set(`search:${query}`, JSON.stringify(results), "EX", 300)
    return results
  },
}

module.exports = tweetQueries 