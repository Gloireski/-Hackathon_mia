/**
 * Contrôleur pour la gestion des tweets
 * Gère la création, modification, suppression et interaction avec les tweets
 */
const { notificationQueue, addNotificationToQueue } = require('../queues/notificationQueue')  // File d'attente pour les notifications
const { Tweet, tweetValidation } = require('../models/tweets')  // Modèle et validation des tweets
const redis = require('../config/redis')  // Client Redis pour la mise en cache
const { wss } = require('../wsServer')  // Serveur WebSocket pour les communications en temps réel
const mediaQueue = require('../queues/mediaQueue')  // File d'attente pour le traitement des médias
const ObjectId = require('mongoose').Types.ObjectId  // Utilitaire pour valider les IDs MongoDB
const { Comment, commentValidation } = require('../models/comments')  // Modèle et validation des commentaires
const { Like } = require('../models/likes')  // Modèle des likes
const { User } = require('../models/users')  // Modèle des utilisateurs

/**
 * Classe contrôleur avec méthodes statiques pour gérer les tweets
 */
class tweetController {
    /**
     * Crée un nouveau tweet
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Le tweet créé
     */
    static async createTweet (req, res) {
        try {
            // Conversion des hashtags en tableau si nécessaire
            req.body.hashtags = Array.isArray(req.body.hashtags)
            ? req.body.hashtags
            : req.body.hashtags
            ? req.body.hashtags.split(',').map(tag => tag.trim())
            : []
            
            // Validation des données d'entrée
            const { error, value } = tweetValidation.validate(req.body)
            if (error) {
              return res.status(400).json({ message: error.details[0].message })
            }
            console.log(value)
            
            const { content, mentions, hashtags } = req.body;
            console.log(req.user)
            const author = req.user.id;
            let mediaUrl = null;
        
            // Traitement du média si présent
            if (req.file) {
              mediaUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        
              // Ajout du média à la file d'attente pour traitement asynchrone
              await mediaQueue.add({ filePath: mediaUrl });
            }
        
            // Création du tweet
            const tweet = new Tweet({
              content,
              media: mediaUrl,
              author,
              mentions,
              hashtags: hashtags ? hashtags.map((tag) => tag.toLowerCase()) : [],
            });
            await tweet.save();
        
            // Notification WebSocket pour les abonnés
            const payload = JSON.stringify({
              type: "NEW_TWEET",
              tweetId: tweet._id,
              content: tweet.content,
              author: author,
            });
        
            // Envoi de la notification à tous les clients connectés
            wss.clients.forEach((client) => client.send(payload));
        
            res.status(201).json(tweet);
          } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erreur lors de la création du tweet" });
          }
    }

    /**
     * Gère le like d'un tweet par un utilisateur
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Statut du like et nombre total de likes
     */
    static async likeTweet (req, res) {
      try {
        // Récupération de l'ID du tweet depuis l'URL
        const tweetId = req.params.id.trim();
        // Récupération de l'ID de l'utilisateur authentifié
        const userId = req.user.id
        console.log(req.user)
        
        // Vérification que le tweet existe
        const tweet = await Tweet.findById(tweetId).select('likes author');;
        if (!tweet) return res.status(404).json({ error: "Tweet non trouvé" });

        // Vérification si l'utilisateur a déjà liké ce tweet
        const existingLike = await Like.findOne({ user: userId, tweet: tweetId });
        if (existingLike) {
          // Si déjà liké, retirer le like (dislike)
          await Like.deleteOne({ _id: existingLike._id });
          tweet.likes = tweet.likes.filter(id => id.toString() !== userId);
          await tweet.save();
          return res.json({ success: true, liked: false, likes: tweet.likes.length })
        }
      
        // Ajout du like
        const newLike = new Like({ user: userId, tweet: tweetId })
        await newLike.save()

        tweet.likes.push(userId)
        await tweet.save()
        
        // Ajouter une notification pour l'auteur du tweet
        const message = `${req.user.username} a liké votre tweet!`
        await addNotificationToQueue(tweet.author.toString(), message)

        return res.json({ success: true, liked: true, likes: tweet.likes.length })

      } catch(error) {
        return res.status(500).json({ error: "Erreur interne du serveur" })
      }
    }

    /**
     * Gère le retweet d'un tweet par un utilisateur
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Le retweet créé
     */
    static async reTweet (req, res) {
      // Récupération de l'ID du tweet depuis l'URL
      const tweetId = req.params.id.trim()
      // Récupération des infos de l'utilisateur authentifié
      const user = req.user
      console.log(user)

      // Vérification que le tweet existe
      const tweet = await Tweet.findById(tweetId)
      console.log(tweet)
      if (!tweet) return res.status(404).json({ error: "Tweet non trouvé" });

      try {
        // Création du retweet
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
          hashtags: tweet.hashtags
        })
        await reTweet.save(); // Sauvegarde du retweet

        // Ajouter le retweet à la liste des retweets du tweet original
        tweet.retweets.push(reTweet._id);
        await tweet.save(); // Sauvegarde du tweet original

        return res.status(201).json(reTweet);
      } catch(error) {
        return res.status(500).json({ error: "Erreur interne du serveur" });
      }
    }

    /**
     * Récupère tous les tweets
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Liste de tous les tweets
     */
    static async getAllTweets (req, res) {
      const tweets = await Tweet.find()
      res.status(200).json(tweets);
    }

    /**
     * Supprime un tweet spécifique
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Confirmation de la suppression
     */
    static async deleteTweet(req, res) {
      const id = req.params.id.trim()
      // Validation de l'ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      try {
        // Vérification que le tweet existe
          let tweet = await Tweet.findById(id)
          if (!tweet){
              return res.status(404).json({message: `Aucun tweet associé à l'id ${id}`})
          }
          
          // Vérification que l'utilisateur est bien l'auteur du tweet
          const user_id = req.user.id
          if (user_id != tweet.author) {
            return res.status(400).json({ message: "Vous n'etes pas autorise a supprimer ce tweet"})
          }
          
          // Suppression du fichier média associé si présent
          if (tweet.media) {
            const imagePath = path.join(__dirname, '..', 'uploads', path.basename(tweet.media));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
          }

          // Suppression du tweet
          tweet = await Tweet.deleteOne({_id: id})
          res.status(200).json({ message: 'Tweet deleted successfully' }); 
      } catch(error) {
          console.error('Error fetching tweet:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
    }

    /**
     * Ajoute un commentaire à un tweet
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Le commentaire créé
     */
    static async comment(req, res) {
      const id = req.params.id.trim()
      // Validation de l'ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      try {
        // Vérification que le tweet existe
        const tweet = await Tweet.findById(id).populate("author", "username");
        if (!tweet) {
          return res.status(404).json({ message: `Aucun tweet associé à l'id ${id}` });
        }
        
        // Validation des données du commentaire
        const { error, value } = commentValidation.validate(req.body)

        if (error) {
          return res.json({ message: error.details[0].message})
        }

        // Récupération de l'ID de l'auteur du commentaire
        const author = req.user.id
        // Création du commentaire
        const newComment = new Comment({
          content: req.body.content,
          author,
          tweet: id
        })

        // Ajout du commentaire au tweet et sauvegarde
        tweet.comments.push(newComment._id)
        await newComment.save()
        await tweet.save()

        // Ajout d'une notification si l'auteur du commentaire n'est pas l'auteur du tweet
        if (tweet.author._id.toString() !== author) {
          const message = `${req.user.username} a commenté votre tweet.`;
          await addNotificationToQueue(tweet.author._id.toString(), message);
        }
        return res.status(200).json(newComment)
          
      } catch(error) {
          console.error('Error fetching tweet:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
    }

    /**
     * Récupère un tweet spécifique
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Le tweet demandé
     */
    static async getTweet (req, res) {
      const tweets = await Tweet.find()
      res.status(200).json(tweets)
    }

    /**
     * Récupère le fil d'actualité personnalisé de l'utilisateur
     * @static
     * @async
     * @param {Object} req - Objet de requête Express
     * @param {Object} res - Objet de réponse Express
     * @returns {Object} Liste de tweets pour le fil d'actualité
     */
    static async getTimeline(req, res) {
      try {
        const userId = req.user.id;
    
        // Récupération des utilisateurs suivis et des bookmarks
        const user = await User.findById(userId).select('followings bookmarks');
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    
        // Récupération des tweets des utilisateurs suivis
        const followedTweets = await Tweet.find({ author: { $in: user.followings } })
          .populate('author', 'username profile_img')
          .sort({ createdAt: -1 }) // Tri du plus récent au plus ancien
          .limit(50);
    
        // Récupération des tweets likés et retweetés par l'utilisateur
        const likedAndRetweetedTweets = await Like.find({ user: userId })
          .populate({
            path: 'tweet',
            populate: { path: 'author', select: 'username profile_img' }
          })
          .sort({ createdAt: -1 })
          .limit(50);
    
        // Récupération des tweets contenant les hashtags les plus consultés
        const trendingHashtags = await Tweet.aggregate([
          { $unwind: "$hashtags" },
          { $group: { _id: "$hashtags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);
    
        const tweetsWithTrendingHashtags = await Tweet.find({
          hashtags: { $in: trendingHashtags.map(tag => tag._id) }
        })
          .populate('author', 'username profile_img')
          .sort({ engagementScore: -1 }) // Tri par engagement global
          .limit(50);
    
        // Fusion de tous les tweets et tri par date et engagement
        const timelineTweets = [...followedTweets, ...likedAndRetweetedTweets.map(like => like.tweet), ...tweetsWithTrendingHashtags];
    
        // Suppression des doublons et tri par engagement (likes + retweets)
        const uniqueTweets = Array.from(new Map(timelineTweets.map(tweet => [tweet._id.toString(), tweet])).values())
          .sort((a, b) => (b.likes.length + b.retweets.length) - (a.likes.length + a.retweets.length));
    
        res.json({ success: true, tweets: uniqueTweets });
    
      } catch (error) {
        console.error("Erreur Timeline:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
      }
    }
}

// Export du contrôleur pour utilisation dans les routes
module.exports = tweetController