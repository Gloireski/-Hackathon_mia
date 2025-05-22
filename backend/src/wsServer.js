'use strict';

/**
 * Configuration du serveur WebSocket
 * Gère les connexions en temps réel pour les notifications et mises à jour
 */
const { WebSocketServer } = require('ws')  // Serveur WebSocket
const WebSocket = require('ws')  // Client WebSocket (pour les constantes)
const http = require('http')  // Module HTTP natif de Node.js
const { v4: uuidv4 } = require('uuid') // Pour générer des IDs uniques
const NotificationService = require('./services/NotificationService')

// Création d'un serveur HTTP pour WebSocket
const server = http.createServer();
// Création du serveur WebSocket
const wss = new WebSocketServer({ server });

// Map pour stocker les connexions des utilisateurs (userId -> websocket)
const clients = new Map();

// Map pour stocker les notifications en attente d'accusé de réception
const pendingAcks = new Map();

/**
 * Vérifie la santé des connexions WebSocket
 */
const checkConnectionHealth = () => {
  clients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clients.delete(userId);
      console.log(`Removed stale connection for user ${userId}`);
    }
  });
};

// Vérification périodique de la santé des connexions
setInterval(checkConnectionHealth, 30000);

/**
 * Gestion des événements de connexion au WebSocket
 */
wss.on("connection", async (ws, req) => {
  console.log("Nouvelle connexion WebSocket", new Date().toISOString());

  /**
   * Gestion des messages reçus
   */
  ws.on("message", async (message) => {
    try {
      // Parsing du message JSON
      const data = JSON.parse(message);
      
      // Enregistrement de l'utilisateur lors de sa connexion
      if (data.type === "register") {
        // Associer l'ID utilisateur au WebSocket
        clients.set(data.userId, ws);
        console.log(`Utilisateur ${data.userId} enregistré à ${new Date().toISOString()}`);
        console.log(`Nombre total de clients connectés: ${clients.size}`);

        // Récupérer et envoyer les notifications en attente
        const pendingNotifications = await NotificationService.getPendingNotifications(data.userId);
        if (pendingNotifications && pendingNotifications.length > 0) {
          console.log(`Envoi de ${pendingNotifications.length} notifications en attente pour ${data.userId}`);
          for (const notif of pendingNotifications) {
            await sendNotification(data.userId, JSON.parse(notif));
          }
        }
      }
      
      // Gestion des accusés de réception
      if (data.type === "notification_ack") {
        const { notificationId, userId } = data;
        if (pendingAcks.has(notificationId)) {
          console.log(`Accusé de réception reçu pour la notification ${notificationId}`);
          // Marquer comme lue dans Redis
          await NotificationService.markNotificationAsRead(userId, notificationId);
          pendingAcks.delete(notificationId);
        }
      }

      // Gestion des notifications marquées comme lues
      if (data.type === "mark_as_read") {
        const { notificationId, userId } = data;
        console.log(`Marquage de la notification ${notificationId} comme lue pour l'utilisateur ${userId}`);
        await NotificationService.markNotificationAsRead(userId, notificationId);
      }
    } catch (error) {
      console.error("Erreur de parsing du message", error);
    }
  });

  /**
   * Gestion de la fermeture de connexion
   */
  ws.on("close", () => {
    // Supprimer l'utilisateur de la map des clients
    let disconnectedUser;
    clients.forEach((value, key) => {
      if (value === ws) {
        disconnectedUser = key;
        clients.delete(key);
      }
    });
    console.log(`Connexion WebSocket fermée pour l'utilisateur ${disconnectedUser} à ${new Date().toISOString()}`);
    console.log(`Nombre de clients restants: ${clients.size}`);
  });

  ws.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
  });

  // Gestion des pongs (réponses aux pings)
  ws.on("pong", () => {
    ws.isAlive = true;
  });
});

// Démarrage du serveur WebSocket sur le port 5001
server.listen(5001, () => {
  console.log("Serveur WebSocket démarré sur le port 5001");
});

/**
 * Envoie une notification à un utilisateur spécifique
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {Object} notification - Objet contenant les détails de la notification
 */
const sendNotification = async (userId, { message, timestamp, read }) => {
  // Récupération du client WebSocket de l'utilisateur
  const client = clients.get(userId);
  console.log(`Tentative d'envoi de notification à ${userId} à ${new Date().toISOString()}`);
  console.log(`Client trouvé: ${!!client}, État: ${client ? client.readyState : 'N/A'}`);
  
  // Générer un ID unique pour la notification
  const notificationId = uuidv4();
  
  // Créer l'objet notification
  const notification = {
    id: notificationId,
    type: "notification",
    message,
    timestamp: timestamp || new Date().toISOString(),
    requiresAck: true,
    read
  };

  // Envoi du message si le client existe et est connecté
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
    // Stocker la notification en attente d'accusé de réception
    pendingAcks.set(notificationId, {
      userId,
      notification,
      timestamp: Date.now()
    });
    console.log(`✅ Notification ${notificationId} envoyée avec succès à ${userId}`);
  } else {
    console.log(`❌ Impossible d'envoyer la notification à ${userId} - Client non connecté ou non trouvé`);
    // Sauvegarder la notification comme en attente dans Redis
    await NotificationService.addPendingNotification(userId, notification);
  }
};

// Export des fonctionnalités pour utilisation dans d'autres modules
module.exports = { wss, sendNotification }