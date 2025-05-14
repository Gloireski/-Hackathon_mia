/**
 * Service de gestion des tokens JWT
 * Gère la génération, la vérification et la révocation des tokens d'authentification
 */
const jwt = require('jsonwebtoken')  // Bibliothèque pour gérer les JWT
const jwtConfig = require('../config/jwtConfig')  // Configuration JWT
const redisClient = require('../config/redis')  // Client Redis pour stocker les tokens

// Préfixes pour les clés Redis
const ACCESS_TOKEN_PREFIX = 'access_token:'  // Préfixe pour les tokens d'accès
const REFRESH_TOKEN_PREFIX = 'refresh_token:'  // Préfixe pour les tokens de rafraîchissement
const BLACKLIST_PREFIX = 'blacklist:'  // Préfixe pour la liste noire des tokens

/**
 * Génère les tokens d'accès et de rafraîchissement pour un utilisateur
 * @async
 * @param {Object} user - Utilisateur pour lequel générer les tokens
 * @returns {Object} Tokens d'accès et de rafraîchissement générés
 */
const generateTokens = async (user) => {
    // Création du payload pour le token d'accès
    const payload = {
        id: user._id,
        username: user.username,
        email: user.email
    }
    
    // Génération du token d'accès
    const accessToken = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.accessTokenExpiration,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
    })
    
    // Génération du token de rafraîchissement (avec moins d'informations)
    const refreshToken = jwt.sign({ id: user._id }, jwtConfig.secret, {
        expiresIn: jwtConfig.refreshTokenExpiration,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
    })

    // Conversion des durées d'expiration en secondes pour Redis
    const accessExpiry = parseInt(jwtConfig.accessTokenExpiration) || 7200  // 2h par défaut
    const refreshExpiry = parseInt(jwtConfig.refreshTokenExpiration) || 604800  // 7j par défaut

    // Stockage du token d'accès dans Redis
    await redisClient.setex(
        `${ACCESS_TOKEN_PREFIX}${user._id}`,
        accessExpiry,
        accessToken
    )
    
    // Stockage du token de rafraîchissement dans Redis
    await redisClient.setex(
        `${REFRESH_TOKEN_PREFIX}${user._id}`,
        refreshExpiry,
        refreshToken
    )
    
    // Retour des tokens générés
    return { accessToken, refreshToken }
}

/**
 * Vérifie si un token est dans la liste noire
 * @async
 * @param {string} token - Token à vérifier
 * @returns {boolean} true si le token est dans la liste noire, false sinon
 */
const isTokenBlacklisted = async (token) => {
    const blacklisted = await redisClient.get(`${BLACKLIST_PREFIX}${token}`)
    return !!blacklisted  // Conversion en booléen
}

/**
 * Ajoute un token à la liste noire
 * @async
 * @param {string} token - Token à blacklister
 * @param {number} expiry - Durée de conservation dans la liste noire (en secondes)
 * @returns {Promise<void>}
 */
const blacklistToken = async (token, expiry = 3600) => {
    // Ajout du token dans la liste noire pour la durée spécifiée
    await redisClient.setex(`${BLACKLIST_PREFIX}${token}`, expiry, 'true')
}

/**
 * Vérifie la validité d'un token JWT
 * @async
 * @param {string} token - Token à vérifier
 * @returns {Object} Payload décodé du token
 * @throws {Error} Si le token est invalide ou dans la liste noire
 */
const verifyToken = async (token) => {
    // Vérification si le token est dans la liste noire
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
        throw new Error('Token is blacklisted');
    }
    
    // Vérification cryptographique du token
    const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
    })
    console.log("Decoded token:", decoded.id);
    return decoded
}

/**
 * Génère un nouveau token d'accès à partir d'un token de rafraîchissement
 * @async
 * @param {string} refreshToken - Token de rafraîchissement
 * @returns {string} Nouveau token d'accès
 * @throws {Error} Si le token de rafraîchissement est invalide
 */
const refreshAccessToken = async (refreshToken) => {
    const isBlacklisted = await isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
        const err = new Error('Invalid refresh token');
        err.name = 'InvalidRefreshToken';
        throw err;
    }
    try {
        // Vérification du token de rafraîchissement
        const decoded = jwt.verify(refreshToken, jwtConfig.secret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        })
        
        // Génération d'un nouveau token d'accès
        const accessToken = jwt.sign({ id: decoded.id }, jwtConfig.secret, {
            expiresIn: jwtConfig.accessTokenExpiration,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        })
        
        return accessToken;
    } catch (error) {
        console.error("Error in refreshAccessToken:", error);
        throw error;
    }
}

/**
 * Révoque tous les tokens d'un utilisateur
 * @async
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<void>}
 */
const revokeAllUserTokens = async (userId) => {
    // Suppression des tokens d'accès et de rafraîchissement de Redis
    await redisClient.del(`${ACCESS_TOKEN_PREFIX}${userId}`)
    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`)
}

// Export des fonctions du service pour utilisation dans d'autres modules
module.exports = {
    generateTokens,
    verifyToken,
    blacklistToken,
    isTokenBlacklisted,
    refreshAccessToken,
    revokeAllUserTokens
}