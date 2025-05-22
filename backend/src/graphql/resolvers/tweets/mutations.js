const { Tweet } = require('../../../models/tweets')
const { Like } = require('../../../models/likes')
const { verifyToken } = require('../../../utils/auth')
const redis = require('../../../config/redis')
const { wss } = require('../../../wsServer')
const { handleUpload } = require('../../../utils/graphUpload')
const mediaQueue = require('../../../queues/mediaQueue')
const { notificationQueue } = require('../../../queues/notificationQueue')


const tweetMutations = {
  createTweet: async (_, { content, media, mentions, hashtags }, { req }) => {
    const user = await verifyToken(req)
    if (!user) throw new Error("Non authentifié");
    console.log("Utilisateur authentifié:", user.id);
    console.log("Content reçu:", content);
  
    if (!content || content.trim() === "") {
      throw new Error("Le contenu du tweet ne peut pas être vide.");
    }
    let mediaUrl = null;

    if (media) {
      mediaUrl = await handleUpload(media)
      await mediaQueue.add({ filePath: mediaUrl });
    }

    const tweetHashtags = hashtags ? hashtags.map(tag => tag.toLowerCase()) : [];

    const tweet = new Tweet({
      content,
      media: mediaUrl,
      author: user.id,
      mentions,
      hashtags: tweetHashtags,
    });
    await tweet.save();

    const payload = JSON.stringify({
      type: "NEW_TWEET",
      tweetId: tweet._id,
      content: tweet.content,
      author: user.id,
    });
    wss.clients.forEach(client => client.send(payload))
    await redis.del(`timeline:${user.id}`);

    return tweet;
  },

  likeTweet: async (_, { tweetId }, { req }) => {
    const user = await verifyToken(req)
    if (!user) throw new Error("Requiert authentification")
    const tweet = await Tweet.findById(tweetId)

    if (!tweet) throw new Error("Tweet not found")
    const userId = user.id.toString()

    const existingLike = await Like.findOne({ user: userId, tweet: tweetId })
    const alreadyLiked = tweet.likes.includes(userId)

    if (existingLike) {
       await Like.deleteOne({ _id: existingLike._id })
       tweet.likes = tweet.likes.filter(id => id.toString() !== userId)
       await tweet.save()
       return { success: true, liked: false, likes: tweet.likes.length }
    } 

    const newLike = new Like({ user: userId, tweet: tweetId })
    await newLike.save()

    tweet.likes.push(userId)
    await tweet.save()

    if (tweet.author.toString() !== user.id) {
      await notificationQueue.add({
        recipientId: tweet.author.toString(),
        message: `${user.username} a liké votre tweet!`,
      })
    }
  
    return {
      success: true,
      liked: !alreadyLiked,
      likes: tweet.likes.length,
      tweet: await Tweet.findById(tweetId).populate("author likes"),
    }
  },

  reTweet: async (_, { tweetId }, { req }) => {
    try {
      const user = await verifyToken(req)
      if (!user) throw new Error("Requiert authentification")
      const tweet = await Tweet.findById(tweetId);
      if (!tweet) throw new Error("Tweet non trouvé")
      
      if (tweet.author.toString() === user.id) {
        throw new Error("Vous ne pouvez pas retweeter votre propre tweet.")
      }
  
      const existingRetweet = await Tweet.findOne({
        originalTweet: tweetId,
        author: user.id,
        isRetweet: true,
      });
  
      if (existingRetweet) {
        await Tweet.findByIdAndDelete(existingRetweet._id);
        
        await Tweet.findByIdAndUpdate(tweetId, {
          $pull: { retweets: existingRetweet._id }
        });
  
        return {
          success: true,
          message: "Retweet supprimé",
          tweet: null
        };
      }
  
      const reTweet = new Tweet({
        content: tweet.content,
        media: tweet.media,
        author: user.id,
        originalTweet: tweet._id,
        isRetweet: true,
        mentions: tweet.mentions,
        likes: [],
        comments: [],
        retweets: [],
        hashtags: tweet.hashtags,
      });
  
      await reTweet.save();
  
      tweet.retweets.push(reTweet._id);
      await tweet.save();
      await notificationQueue.add({
        recipientId: tweet.author.toString(),
        message: `${user.username} a retweeté votre tweet!`,
      })
  
      return {
        success: true,
        message: "Retweet ajouté",
        tweet: reTweet
      };
    } catch (error) {
      console.error("Erreur dans reTweet:", error);
      return {
        success: false,
        message: "Erreur interne du serveur",
        tweet: null
      };
    }
  }
}

module.exports = tweetMutations 