/**
 * Utilitaires d'authentification
 * Fournit des fonctions pour la gestion des tokens JWT dans l'API GraphQL
 */
const dotenv = require('dotenv')  // Gestion des variables d'environnement
const { User } = require('../models/users')  // Modèle des utilisateurs
const jwt = require('jsonwebtoken')  // Bibliothèque pour gérer les JWT
const redis = require('../config/redis')  // Client Redis
const { isTokenBlacklisted } = require('../services/tokenService')  // Service de gestion des tokens

// Chargement des variables d'environnement
dotenv.config()

/**
 * Génère un token d'accès pour un utilisateur
 * Utilisé principalement pour l'API GraphQL
 * @param {Object} user - Utilisateur pour lequel générer le token
 * @returns {string} Token d'accès généré
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username },  // Payload du token
        process.env.JWT_SECRET,  // Clé secrète
        { expiresIn: '7200s' }  // Durée de validité (2 heures)
    )
}

/**
 * Vérifie et extrait l'utilisateur à partir de l'en-tête d'autorisation
 * Utilisé principalement dans les resolvers GraphQL
 * @async
 * @param {Object} req - Objet de requête Express
 * @returns {Object|null} Utilisateur authentifié ou null si non authentifié
 */
const verifyToken = async (req) => {
    // Récupération de l'en-tête d'autorisation
    const authHeader = req.headers.authorization
    if (!authHeader) return null
  
    // Extraction du token
    const token = authHeader.split(" ")[1]
    
    // Vérification si le token est dans la liste noire
    const isBlacklisted = await isTokenBlacklisted(token)
    if (isBlacklisted) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    
    try {
      // Vérification et décodage du token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Récupération de l'utilisateur correspondant
      const user = await User.findById(decoded.id)
      return user;
    } catch (err) {
      return null
    }
};

// Export des fonctions pour utilisation dans d'autres modules
module.exports = { generateAccessToken, verifyToken }