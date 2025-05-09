/**
 * Définition des requêtes GraphQL
 * Regroupe toutes les opérations GraphQL qui récupèrent des données
 */
import { gql } from "@apollo/client";

/**
 * Requête pour récupérer un tweet spécifique par son ID
 * Inclut les détails du tweet, de l'auteur et des commentaires
 * 
 * @param {ID!} id - ID du tweet à récupérer
 * @returns Les informations complètes du tweet avec ses commentaires
 */
export const GET_TWEET = gql`
  query GetTweet($id: ID!) {
    getTweet(id: $id) {
      id
      content
      createdAt
      media
      isLiked
      isRetweeted
      author {
        _id
        username
        handle
        profile_img
      }
      comments {
        id
        content
        createdAt
        author {
          _id
          username
          handle
          profile_img
        }
      }
    }
  }
`
/**
 * Requête GraphQL pour récupérer les tweets de la timeline
 */
export const GET_TWEETS = gql`
  query GetTweets {
    getTimeline {
      tweets {
        id
        content
        media
        likes
        retweets
        isRetweet
        isRetweeted
        isLiked
        isFollowing
        createdAt
        comments
        author {
          profile_img
          _id
          username
        }
      }
      followingUsers
    }
  }
`
export const GET_ALL_TWEETS = gql`
  query GET_ALL_TWEETS {
    publicTimeline {
      id
      content
      media
      likes
      retweets
      isRetweet
      isRetweeted
      isLiked
      isFollowing
      createdAt
      comments
      author {
        profile_img
        _id
        username
      }
    }
  }
`
/**
 * Requête GraphQL pour récupérer les informations de l'utilisateur connecté
 * et ses différents contenus (tweets, commentaires, likes, favoris)
 */
export const GET_USER_INFO = gql`
  query User {
    userTimeline {
      user {
        _id
        username
        email
        profile_img
        bio
      }
      tweets {
        id
        content
        media
        createdAt
        
        author {
          _id
          username
          profile_img
        }
      }
      comments {
        id
        content
        author {
          _id
          username
          profile_img
        }
        tweetId
        }
      likedTweets {
          id
          content
          media
          createdAt
          
          author {
            _id
            username
            profile_img
          }
      }
      bookmarks {
        id
        content
      }
    }
  }
`