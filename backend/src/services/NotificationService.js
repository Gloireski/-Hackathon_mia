'use strict';

/**
 * Service de gestion des notifications
 * Gère le stockage, la récupération et la suppression des notifications dans Redis
 */
const redis = require("../config/redis");  // Client Redis pour stocker les notifications

/**
 * Classe statique pour la gestion des notifications
 */
class NotificationService {
  /**
   * Ajoute une notification pour un utilisateur spécifique
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur destinataire
   * @param {Object} notification - Objet notification à stocker
   * @returns {Promise<void>}
   */
  static async addNotification(userId, notification) {
    // Clé Redis pour les notifications de cet utilisateur
    const key = `notifications:${userId}`;

    // Conversion de l'objet notification en chaîne JSON
    const notificationString = JSON.stringify(notification);

    // Stockage dans un ensemble trié Redis (sorted set) avec le timestamp comme score
    // Cela permet d'ordonner les notifications par date
    await redis.zadd(key, Date.now(), notificationString);

    // Définition d'une expiration de 2 jours (172800 secondes)
    // Cela permet de nettoyer automatiquement les anciennes notifications
    await redis.expire(key, 172800);
  }

  /**
   * Ajoute une notification en attente pour un utilisateur
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur destinataire
   * @param {Object} notification - Objet notification à stocker
   * @returns {Promise<void>}
   */
  static async addPendingNotification(userId, notification) {
    const key = `pending:notifications:${userId}`;
    const notificationString = JSON.stringify(notification);
    
    await redis.zadd(key, Date.now(), notificationString);
    // Les notifications en attente expirent après 7 jours
    await redis.expire(key, 604800);
  }

  /**
   * Récupère les notifications en attente d'un utilisateur
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste des notifications en attente
   */
  static async getPendingNotifications(userId) {
    const key = `pending:notifications:${userId}`;
    return await redis.zrange(key, 0, -1);
  }

  /**
   * Supprime une notification en attente
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur
   * @param {string} notificationId - ID de la notification
   * @returns {Promise<void>}
   */
  static async removePendingNotification(userId, notificationId) {
    const key = `pending:notifications:${userId}`;
    const notifications = await redis.zrange(key, 0, -1);
    
    for (const notifString of notifications) {
      const notif = JSON.parse(notifString);
      if (notif.id === notificationId) {
        await redis.zrem(key, notifString);
        break;
      }
    }
  }

  /**
   * Marque une notification comme lue
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur
   * @param {string} notificationId - ID de la notification
   * @returns {Promise<void>}
   */
  static async markNotificationAsRead(userId, notificationId) {
    const key = `notifications:${userId}`;
    const notifications = await redis.zrange(key, 0, -1);
    
    for (const notifString of notifications) {
      const notif = JSON.parse(notifString);
      if (notif.id === notificationId) {
        // Mettre à jour le statut de lecture
        notif.read = true;
        // Supprimer l'ancienne entrée
        await redis.zrem(key, notifString);
        // Ajouter la version mise à jour
        await redis.zadd(key, Date.now(), JSON.stringify(notif));
        break;
      }
    }
  }

  /**
   * Récupère toutes les notifications d'un utilisateur
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste des notifications
   */
  static async getNotifications(userId) {
    // Clé Redis pour les notifications de cet utilisateur
    const key = `notifications:${userId}`;
    
    // Récupération des notifications depuis Redis (triées par ordre inverse)
    // zrevrange permet d'obtenir les éléments du plus récent au plus ancien
    const notifications = await redis.zrevrange(key, 0, -1);
    
    // Conversion des chaînes JSON en objets
    return notifications.map((notif) => JSON.parse(notif));
  }

  /**
   * Supprime une notification spécifique pour un utilisateur
   * @static
   * @async
   * @param {string} userId - ID de l'utilisateur
   * @param {string} notificationId - ID de la notification à supprimer
   * @returns {Promise<void>}
   */
  static async deleteNotification(userId, notificationId) {
    // Clé Redis pour les notifications de cet utilisateur
    const key = `notifications:${userId}`;
    
    // Récupération de toutes les notifications
    const notifications = await redis.zrange(key, 0, -1);
    
    // Parcours des notifications pour trouver celle à supprimer
    for (let notifString of notifications) {
      let notif = JSON.parse(notifString);
      if (notif.id === notificationId) {
        // Suppression de la notification de l'ensemble trié
        await redis.zrem(key, notifString);
        break;
      }
    }
  }
}

// Export de la classe pour utilisation dans d'autres modules
module.exports = NotificationService;