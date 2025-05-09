const redis = require('../config/redis')
const esClient = require('../utils/elasticsearchClient')
const { Tweet } = require('../models/tweets')
const { generateAccessToken, verifyToken } = require('../utils/auth')
const { generateTokens } = require('../services/tokenService')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
const mediaQueue = require('../queues/mediaQueue') // File d'attente Bull pour les médias
const { wss } = require('../wsServer'); // Serveur WebSocket
const { GraphQLUpload } = require('graphql-upload')
const { User } = require("../models/users")
const { handleUpload } = require('../utils/graphUpload')
const { Comment } = require('../models/comments')
const { notificationQueue } = require("../queues/notificationQueue")
const { sendNotification } = require('../wsServer')
const { Like } = require('../models/likes')

const resolvers = {
  // On expose le scalar Upload
  Upload: GraphQLUpload,

  Query: {
    publicTimeline: async () => {
      try {
        
          const tweets = await Tweet.find({})
            .populate("author", "id username profile_img")
            .sort({ createdAt: -1 });
  
          return tweets.map((tweet) => {
            return {
              id: tweet._id,
              content: tweet.content,
              media: tweet.media,
              createdAt: tweet.createdAt.toISOString(),
              likes: tweet.likes.length, // Nombre de likes
              retweets: tweet.retweets.length, // Nombre de retweets
              isRetweet: tweet.isRetweet,
              isLiked: false, // 
              isRetweeted: false, // 
              isFollowing: false, // 
              author: {
                _id: tweet.author._id,
                username: tweet.author.username,
                profile_img: tweet.author.profile_img,
              },
              comments: tweet.comments.map((comment) => comment._id),
            
          }
        })
      } catch (error) {
        console.error("Erreur lors de la récupération des tweets:", error);
        throw new Error("Impossible de récupérer les tweets.");
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
          // isFollowing: false, // Ajoute la logique si nécessaire
          isFollowing: user.followings.includes(tweet.author._id.toString()),
          author: tweet.author ? {
              ...tweet.author._doc,
              id: tweet.author._id.toString()
          } : null, // Gérer le cas où l'auteur est null
          comments: tweet.comments.map((comment) => comment.id),
          // followingUsers: tweet.followingUsers.map((user) => user.id),
        });
    
        return {
          user: userData,
          tweets: tweets.map(formatTimelineResponse),
          comments: comments
          .filter(comment => comment.tweet) // Supprime les commentaires sans tweet valide
          .map(comment => ({
              ...comment._doc,
              id: comment._id.toString(),
              tweetId: comment.tweet ? comment.tweet._id.toString() : null, // Gérer le cas où tweet est null
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

      // Récupérer les tweets des abonnements
      const followedTweets = await Tweet.find({ author: { $in: user.followings } })
        .populate("author", "username handle profile_img")
        .sort({ createdAt: -1 })
        .limit(50);
    
      // Récupérer les tweets likés et retweetés
      const likedAndRetweetedTweets = await Like.find({ user: currentUser.id })
        .populate({
          path: "tweet",
          populate: { path: "author", select: "username handle profile_img" },
        })
        .sort({ createdAt: -1 })
        .limit(50);
    
      // Récupérer les tweets avec les hashtags populaires
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
      // Fusionner et trier les tweets
      const timelineTweets = [
        ...ownTweets, // 🔥 Include user's own tweets
        ...followedTweets,
        ...likedAndRetweetedTweets.map((like) => like.tweet),
        ...tweetsWithTrendingHashtags,
      ];
    
      // Éliminer les doublons
      const uniqueTweets = Array.from(
        new Map(
          timelineTweets
            .filter(tweet => tweet && tweet._id) // ✅ Éviter les valeurs nulles
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
    
      await redis.setex(cacheKey, 20, JSON.stringify(finalTweets)); // Cache pour 60 secondes
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
    getCurrentUser: async (_, __, { req }) => {
        const user = await verifyToken(req)
        if (!user) throw new Error("Non authentifié");
        return user;
    },
    // getUserTweets(userId: ID!): [Tweet!]!
  },

  Mutation: {
    follow: async (_, { userId }, { req }) => {
      const currentUser = await verifyToken(req);
      if (!currentUser) throw new Error("Authentification requise")
    
      if (currentUser.id === userId) {
        throw new Error("Vous ne pouvez pas vous suivre vous-même.");
      }
    
      const user = await User.findById(currentUser.id);
      const targetUser = await User.findById(userId);
    
      if (!targetUser) {
        throw new Error("Utilisateur introuvable.");
      }
    
      const alreadyFollowing = user.followings.includes(userId);
    
      if (alreadyFollowing) {
        user.followings = user.followings.filter(id => id.toString() !== userId);
        targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUser.id);
      } else {
        user.followings.push(userId);
        targetUser.followers.push(currentUser.id);
    
        // ✅ Ajouter une notification
        await notificationQueue.add({
          recipientId: targetUser._id.toString(),
          message: `${user.username} vous suit maintenant!`,
        });
      }
    
      await user.save();
      await targetUser.save();
    
      return {
        success: true,
        following: !alreadyFollowing,
        followersCount: targetUser.followers.length
      };
    },
    bookmarkTweet: async (_, { tweetId }, { req }) => {
      const user = await verifyToken(req);
      if (!user) throw new Error("Authentification requise");
    
      // Vérifier si le tweet existe
      const tweet = await Tweet.findById(tweetId);
      if (!tweet) throw new Error("Tweet non trouvé");
    
      // Ajouter ou retirer le tweet des signets
      const isBookmarked = user.bookmarks.includes(tweetId);
      if (isBookmarked) {
        user.bookmarks = user.bookmarks.filter(id => id.toString() !== tweetId);
      } else {
        user.bookmarks.push(tweetId);
      }
    
      await user.save();
      return user;
    },
    reTweet: async (_, { tweetId }, { req }) => {
      try {
        const user = await verifyToken(req)
        if (!user) throw new Error("Requiert authentification")
        // Vérifier que le tweet existe
        const tweet = await Tweet.findById(tweetId);
        if (!tweet) throw new Error("Tweet non trouvé")
    
        // Vérifier si l'utilisateur a déjà retweeté ce tweet
        const existingRetweet = await Tweet.findOne({
          originalTweet: tweetId,
          author: user.id,
          isRetweet: true,
        });
    
        if (existingRetweet) {
          // Supprimer le retweet existant
          await Tweet.findByIdAndDelete(existingRetweet._id);
          
          // Supprimer l'ID du retweet de la liste des retweets du tweet original
          await Tweet.findByIdAndUpdate(tweetId, {
            $pull: { retweets: existingRetweet._id }
          });
    
          return {
            success: true,
            message: "Retweet supprimé",
            tweet: null
          };
        }
    
        // Créer un nouveau retweet
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
    
        await reTweet.save(); // Sauvegarde du retweet
    
        // Ajouter l'ID du retweet au tweet original
        tweet.retweets.push(reTweet._id);
        await tweet.save(); // Sauvegarde du tweet original
    
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
    ,
    async likeTweet(_, { tweetId }, { req }) {
      const user = await verifyToken(req)
      if (!user) throw new Error("Requiert authentification")
      const tweet = await Tweet.findById(tweetId)

      if (!tweet) throw new Error("Tweet not found")
      const userId = user.id.toString()

      // Vérifier si l'utilisateur a déjà liké ce tweet
      const existingLike = await Like.findOne({ user: userId, tweet: tweetId })
      const alreadyLiked = tweet.likes.includes(userId)

      if (existingLike) {
         // Si déjà liké, retirer le like
          await Like.deleteOne({ _id: existingLike._id })
          tweet.likes = tweet.likes.filter(id => id.toString() !== userId)
          await tweet.save()
          return { success: true, liked: false, likes: tweet.likes.length }
      } 
      // Ajouter le like
      const newLike = new Like({ user: userId, tweet: tweetId })
      await newLike.save()

      tweet.likes.push(userId)
      await tweet.save()
      // Queue a notification for the author
      await sendNotification(tweet.author.toString(), `${user.username} a liké votre tweet!`)
    
      // return tweet
      return {
        success: true,
        liked: !alreadyLiked,
        likes: tweet.likes.length,
        tweet: await Tweet.findById(tweetId).populate("author likes"),
    }
    },
    register: async (_, { username, email, password }) => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
  
        const token = generateAccessToken(user);
        return { ...user._doc, id: user._id, token };
    },

    login: async (_, { email, password }) => {
        const user = await User.findOne({ email })
        if (!user) throw new Error("Utilisateur non trouvé")
  
        const match = await bcrypt.compare(password, user.password)
        if (!match) throw new Error("Mot de passe incorrect")
  
        const { accessToken: token } = await generateTokens(user)
        redis.set(`token_${user._id}`, token, 'EX', 7200)
        return { ...user._doc, id: user._id, token }
    },

    logout: async (_, __, { req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1]; // Récupérer le token
        if (!token) {
          return { success: false, message: "Aucun token fourni." };
        }

        // Ajouter le token à la liste noire avec une expiration (ex: 7 jours)
        await redis.setex(`blacklist:${token}`, 604800, "invalid"); // 604800 sec = 7 jours

        return { success: true, message: "Déconnexion réussie." };
      } catch (error) {
        console.error("Erreur lors du logout:", error);
        return { success: false, message: "Erreur serveur." };
      }
    },
    createTweet: async (_, { content, media, mentions, hashtags }, { req }) => {
      // Vérifier l'authentification (le middleware doit ajouter req.user)
      // Vérifie l'authentification
      const user = await verifyToken(req)
      if (!user) throw new Error("Non authentifié");
      console.log("Utilisateur authentifié:", user.id);
      console.log("Content reçu:", content);
    
      if (!content || content.trim() === "") {
        throw new Error("Le contenu du tweet ne peut pas être vide.");
      }
      let mediaUrl = null;

      // Si un fichier média est fourni, le traiter
      if (media) {
        mediaUrl = await handleUpload(media)
        // Ajouter le média à la file d'attente pour traitement asynchrone
        await mediaQueue.add({ filePath: mediaUrl });
      }

      // Convertir les hashtags en minuscules (si présents)
      const tweetHashtags = hashtags ? hashtags.map(tag => tag.toLowerCase()) : [];

      // Créer le tweet dans la base
      const tweet = new Tweet({
        content,
        media: mediaUrl,
        author: user.id,
        mentions,
        hashtags: tweetHashtags,
      });
      await tweet.save();

      // Envoyer une notification via WebSocket à tous les clients connectés
      const payload = JSON.stringify({
        type: "NEW_TWEET",
        tweetId: tweet._id,
        content: tweet.content,
        author: user.id,
      });
      wss.clients.forEach(client => client.send(payload))
      await redis.del(`timeline:${user.id}`); // 🔥 Clear cache so the timeline updates

      return tweet;
    },
  },
}

module.exports = resolvers
