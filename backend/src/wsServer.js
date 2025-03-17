/**
 * Configuration du serveur WebSocket
 * Gère les connexions en temps réel pour les notifications et mises à jour
 */
const { WebSocketServer } = require('ws')  // Serveur WebSocket
const WebSocket = require('ws')  // Client WebSocket (pour les constantes)
const http = require('http')  // Module HTTP natif de Node.js

// Création d'un serveur HTTP pour WebSocket
const server = http.createServer();
// Création du serveur WebSocket
const wss = new WebSocketServer({ server });

// Map pour stocker les connexions des utilisateurs (userId -> websocket)
const clients = new Map();

/**
 * Gestion des événements de connexion au WebSocket
 */
wss.on("connection", (ws, req) => {
  console.log("Nouvelle connexion WebSocket");

  /**
   * Gestion des messages reçus
   */
  ws.on("message", (message) => {
    try {
      // Parsing du message JSON
      const data = JSON.parse(message);
      
      // Enregistrement de l'utilisateur lors de sa connexion
      if (data.type === "register") {
        // Associer l'ID utilisateur au WebSocket
        clients.set(data.userId, ws);
        console.log(`Utilisateur ${data.userId} enregistré`);
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
    clients.forEach((value, key) => {
      if (value === ws) clients.delete(key);
    });
    console.log("Connexion WebSocket fermée");
  });
});

// Démarrage du serveur WebSocket sur le port 5001
server.listen(5001, () => {
  console.log("Serveur WebSocket démarré sur le port 5001");
});

/**
 * Envoie une notification à un utilisateur spécifique
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {string} message - Contenu de la notification
 */
const sendNotification = (userId, message) => {
  // Récupération du client WebSocket de l'utilisateur
  const client = clients.get(userId);
  console.log(`message: ${message}`)
  // Envoi du message si le client existe et est connecté
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: "notification", message }));
  }
};

// Export des fonctionnalités pour utilisation dans d'autres modules
module.exports = { wss, sendNotification }