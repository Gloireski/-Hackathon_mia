'use strict';

/**
 * Configuration de la file d'attente pour les notifications
 * Utilise Bull pour gérer le traitement asynchrone des notifications
 */
const Queue = require("bull")  // Bibliothèque de gestion de files d'attente
const { sendNotification } = require('../wsServer')  // Fonction d'envoi via WebSocket

/**
 * Création d'une file d'attente nommée "notifications"
 * Configuration pour se connecter à Redis (backend de stockage de Bull)
 */
const notificationQueue = new Queue("notifications", {
  redis: { host: "127.0.0.1", port: 6379 },  // Connexion à Redis local
});

/**
 * Définition du processus de traitement des notifications
 * @async
 * @param {Object} job - Tâche Bull contenant les données de la notification
 */
notificationQueue.process(async (job) => {
  // Extraction des données de la notification
  const { recipientId, message, timestamp } = job.data;
  console.log(`🔔 Envoi notification à ${recipientId}: ${message}`);
  
  // Dans un cas réel, on pourrait également sauvegarder la notification en base de données,
  // envoyer un email, ou déclencher d'autres actions

  // Émission de la notification en temps réel via WebSockets avec timestamp
  await sendNotification(recipientId, {
    message,
    timestamp,
    read: false,
    recipientId
  })
});

/**
 * Ajoute une notification à la file d'attente
 * @async
 * @param {string} recipientId - ID de l'utilisateur destinataire
 * @param {string} message - Contenu de la notification
 */
const addNotificationToQueue = async (recipientId, message) => {
  // Ajout à la file avec timestamp et 3 tentatives en cas d'échec
  await notificationQueue.add({
    recipientId,
    message,
    timestamp: new Date().toISOString()
  }, { attempts: 3 })
}

// Export des fonctionnalités pour utilisation dans d'autres modules
module.exports = { notificationQueue, addNotificationToQueue }