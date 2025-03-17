/**
 * Définition des mutations GraphQL
 * Regroupe toutes les opérations GraphQL qui modifient des données
 */
import { gql } from "@apollo/client";

/**
 * Mutation pour connecter un utilisateur
 * Renvoie les informations de l'utilisateur et son token d'authentification
 */
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
        _id
        username
        email
        profile_img
        token
    }
  }
`

/**
 * Mutation pour suivre/ne plus suivre un utilisateur
 * Renvoie le statut du suivi et le nombre de followers mis à jour
 */
export const FOLLOW_MUTATION = gql`
  mutation FollowUser($userId: ID!) {
    follow(userId: $userId) {
      success
      followersCount
      following
    }
  }
`

/**
 * Mutation pour liker/unliker un tweet
 * Renvoie le statut du like et les informations mises à jour du tweet
 */
export const LIKE_TWEET = gql`
  mutation LikeTweet($tweetId: ID!) {
    likeTweet(tweetId: $tweetId) {
      success
      liked
      likes
      tweet {
        id
        content
        author {
          username
        }
      }
    }
  }
`

/**
 * Mutation pour retweeter/annuler un retweet
 * Renvoie le statut de l'opération et un message de confirmation
 */
export const RE_TWEET = gql`
  mutation reTweet($tweetId: ID!) {
    reTweet(tweetId: $tweetId) {
      success
      message
    }
  }
`