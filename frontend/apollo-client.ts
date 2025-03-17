/**
 * Configuration du client Apollo pour les requêtes GraphQL
 * Crée et configure un client Apollo avec authentification
 */
import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';

/**
 * Crée un client Apollo configuré avec l'authentification
 * @param {string|null} token - Token JWT d'authentification
 * @returns {ApolloClient} Client Apollo configuré
 */
export const createApolloClient = (token: string | null) => {
  // Création du lien HTTP pointant vers le serveur GraphQL
  const httpLink = new HttpLink({
      uri: "http://localhost:4000/graphql", // URL du serveur GraphQL
  });

  /**
   * Lien d'authentification qui injecte le token dans les en-têtes
   * de chaque requête GraphQL
   */
  const authLink = setContext((_, { headers }) => ({
      headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '', // Ajout du token d'authentification
      },
  }));

  // Création et configuration du client Apollo
  return new ApolloClient({
      link: from([authLink, httpLink]), // Composition des liens (auth puis http)
      cache: new InMemoryCache(), // Cache en mémoire pour les résultats des requêtes
  });
};