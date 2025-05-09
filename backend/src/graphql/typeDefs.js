/**
 * Définitions des types GraphQL
 * Décrit le schéma de l'API GraphQL, avec les types, requêtes et mutations disponibles
 */
const { gql } = require('apollo-server')  // Import de gql pour définir le schéma GraphQL

/**
 * Définition du schéma GraphQL
 * @typedef {String} Schema
 */
const typeDefs = gql`
  # Scalar Upload pour gérer les fichiers
  scalar Upload

  # Type pour la réponse de tweet avec des informations supplémentaires
  type TweetResponse {
    id: ID
    content: String
    media: String
    createdAt: String
    likes: Int
    retweets: Int
    isRetweet: Boolean
    isLiked: Boolean
    isRetweeted: Boolean
    isFollowing: Boolean
    author: UserBasicInfo
    comments: [CommentResponse]
  }
  
  # Type principal pour les tweets
  type Tweet {
    id: ID!
    content: String!
    media: String
    author: User!
    mentions: [User]
    likes: [User]
    comments: [Comment]
    isRetweet: Boolean
    retweets: [Tweet]
    hashtags: [String]
    createdAt: String!
  }
  
  # Type pour les tweets dans le timeline
  type TimelineResponse {
    id: ID
    content: String
    media: String
    createdAt: String
    likes: Int # Nombre de likes plutôt que le tableau de likes
    retweets: Int # Nombre de retweets plutôt que le tableau de retweets
    isRetweet: Boolean
    isLiked: Boolean
    isRetweeted: Boolean
    isFollowing: Boolean
    author: User
    comments: [ID]
  }
  
  # Type pour les commentaires
  type Comment {
    id: ID!
    content: String!
    author: User!
    createdAt: String!
    tweetId: ID!
  }

  # Type pour les utilisateurs
  type User {
    _id: ID!
    username: String
    handle: String!
    email: String!
    token: String
    tweets: [Tweet]
    bio: String
    profile_img: String
    banniere_img: String
    followers: [String]
    followings: [String]
  }
  
  # Type simplifié pour les informations de base d'un utilisateur
  type UserBasicInfo {
    _id: ID!
    username: String
    handle: String
    profile_img: String
  }
  
  # Type pour les réponses de commentaires
  type CommentResponse {
    id: ID
    content: String
    createdAt: String
    author: UserBasicInfo
  }

  # Requêtes GraphQL disponibles
  type Query {
    # Récupère un tweet par son ID
    getTweet(id: ID!): TweetResponse
    
    # Recherche des tweets par texte
    searchTweets(query: String!): [Tweet]
    
    # Récupère l'utilisateur authentifié
    getCurrentUser: User
    
    # Récupère le fil d'activité d'un utilisateur
    userTimeline: userTimeline!
    
    # Récupère le fil d'actualité personnalisé
    getTimeline: [TimelineResponse!]!

    #fil public
    publicTimeline: [TimelineResponse!]!
    
    # Récupère les tweets d'un utilisateur spécifique
    getUserTweets(userId: ID!): [Tweet!]!
  }

  # Mutations GraphQL disponibles
  type Mutation {
    # Suivre/ne plus suivre un utilisateur
    follow(userId: ID!): FollowResponse!
    
    # Liker/unliker un tweet
    likeTweet(tweetId: ID!): LikeResponse
    
    # Créer un nouveau tweet
    createTweet(
      content: String!
      media: Upload
      mentions: [ID]
      hashtags: [String]
    ): Tweet!
    
    # Inscrire un nouvel utilisateur
    register(
      username: String!,
      email: String!,
      password: String!
      ): User
      
    # Retweeter un tweet
    reTweet(tweetId: ID!): RetweetResponse
    
    # Ajouter/retirer un tweet des favoris
    bookmarkTweet(tweetId: ID!): User
    
    # Connecter un utilisateur
    login(email: String!, password: String!): User
    
    # Déconnecter un utilisateur
    logout: LogoutResponse!
  }
  
  # Type pour la réponse d'un retweet
  type RetweetResponse {
    success: Boolean!
    message: String!
    tweet: Tweet
  }
  
  # Type pour la réponse de déconnexion
  type LogoutResponse {
    success: Boolean!
    message: String!
  }
  
  # Type pour la réponse d'un like
  type LikeResponse {
    success: Boolean!
    liked: Boolean!
    likes: Int!
    tweet: Tweet
  }
  
  # Type pour la réponse d'un suivi
  type FollowResponse {
    success: Boolean!
    following: Boolean!
    followersCount: Int!
  }
  
  # Type pour le fil d'activité d'un utilisateur
  type userTimeline {
    user: User!
    tweets: [TimelineResponse!]!
    comments: [Comment!]!
    likedTweets: [TimelineResponse!]!
    bookmarks: [TimelineResponse!]!
  }
`;

// Export des définitions de types pour utilisation dans la configuration Apollo Server
module.exports = typeDefs