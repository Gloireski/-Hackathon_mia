/**
 * Contrôleur pour la gestion de l'authentification
 * Gère l'inscription, la connexion, la déconnexion et autres fonctionnalités liées à l'authentification
 */
const bcrypt = require('bcryptjs')  // Import de bcryptjs pour le hashage des mots de passe
const { Tweet, Like, Comment, User, userValidation } = require('../models')
const tokenService = require('../services/tokenService')  // Service de gestion des tokens JWT
const emailService = require('../services/emailService')  // Service d'envoi d'emails

/**
 * Gère l'inscription d'un nouvel utilisateur
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Informations sur l'utilisateur créé
 */
const register = async (req, res) => {
    try {
        // Validation des données d'entrée avec Joi
        const { error, value } = userValidation.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }

        const { username, email, password } = value
        
        // Vérification si l'email ou le nom d'utilisateur existe déjà
        const userExists = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (userExists) {
            return res.status(400).json({ 
                message: 'Cet email ou nom d\'utilisateur est déjà utilisé.' 
            });
        }
        
        // Hashage du mot de passe
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        
        // Génération du token de vérification d'email
        const verificationToken = emailService.generateToken()
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)  // Expire dans 24h

        // Récupération de l'image de profil si présente
        const profile_img = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null
        
        // Génération d'un handle unique
        let baseHandle = req.body.username.toLowerCase().replace(/\s+/g, '_')
        let handle = baseHandle;
        let count = 1;

        // Vérification de l'unicité du handle
        while (await User.findOne({ handle: handle })) {
            handle = `${baseHandle}${count++}`;
        }
        
        // Création du nouvel utilisateur
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            bio: '',
            profile_img,
            banniere_img: null,
            followers: [],
            bookmarks: [],
            verificationToken,
            verificationTokenExpires,
            isEmailVerified: false,
            handle
        })

        // Génération de l'URL pour la vérification de l'email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`

        // Envoi de l'email de vérification
        try {
            await emailService.sendVerificationEmail(newUser, verificationUrl)
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email:', emailError)
        }
        
        // Réponse avec les informations de l'utilisateur créé
        res.status(201).json({
            message: 'Utilisateur créé avec succès. Veuillez vérifier votre email.',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePicture: newUser.profile_img,
                isEmailVerified: newUser.isEmailVerified
            }
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' })
    }
}

/**
 * Gère la connexion d'un utilisateur
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Informations sur l'utilisateur et tokens de connexion
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validation des données d'entrée
        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe requis' })
        }
        
        // Recherche de l'utilisateur par email
        const user = await User.findOne({ email });
        // console.log(user)
        if (!user) {
            console.log("user not found")
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
        }
        
        // Vérification du mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log("password not match")
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
        }
        
        // Génération des tokens d'accès et de rafraîchissement
        const { accessToken, refreshToken } = await tokenService.generateTokens(user)

         res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false, // secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: 'api/auth/refresh-token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        
        // Réponse avec les informations utilisateur et les tokens
        res.status(200).json({
        message: 'Connexion réussie',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profile_img,
            isEmailVerified: user.isEmailVerified
        },
        tokens: {
            accessToken,
            // refreshToken
        }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la connexion' })
    }
}

/**
 * Gère la déconnexion d'un utilisateur
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Confirmation de la déconnexion
 */
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            await tokenService.blacklistToken(refreshToken);
        }
        // Récupération du token d'accès
        const token = req.headers.authorization.split(' ')[1]
        console.log('logout',token)
        
        // Mise en liste noire du token (invalidation)
        await tokenService.blacklistToken(token)
        
        console.log('user id', req.user.id)
        // Révocation de tous les tokens de l'utilisateur
        await tokenService.revokeAllUserTokens(req.user.id)

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: false, // secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: 'api/auth/refresh-token',
        });

        res.status(200).json({ message: 'Déconnexion réussie' })
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la déconnexion' })
    }
}

/**
 * Récupère les informations de l'utilisateur connecté
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Informations détaillées sur l'utilisateur
 */
const getMe = async (req, res) => {
    try {
        // Recherche de l'utilisateur par son ID (récupéré du token)
        const user = await User.findById(req.user.id)
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        
        // Réponse avec les informations détaillées de l'utilisateur
        res.status(200).json({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profile_img,
            bannerPicture: user.banniere_img,
            bio: user.bio,
            followers: user.followers.length,
            following: user.following ? user.following.length : 0,
            createdAt: user.createdAt,
            isEmailVerified: user.isEmailVerified,
        }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

/**
 * Rafraîchit le token d'accès à l'aide du token de rafraîchissement
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Nouveau token d'accès
 */
const refreshToken = async (req, res) => {
    try {
        console.log('called')
        // Récupération du token de rafraîchissement
        const { refreshToken } = req.cookies

        console.log('cookies ref', refreshToken)
        if (!refreshToken) {
            return res.status(400).json({ message: 'Token de rafraîchissement manquant' })
        }
        // console.log('refreshToken', refreshToken)

        // Génération d'un nouveau token d'accès
        const newAccessToken = await tokenService.refreshAccessToken(refreshToken)
        
        // Réponse avec le nouveau token d'accès
        res.status(200).json({
            accessToken: newAccessToken
        });
    } catch (error) {
        // Gestion des différentes erreurs liées aux tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token de rafraîchissement expiré, reconnexion nécessaire' })
        }
        
        if (error.message === 'Invalid refresh token') {
            return res.status(401).json({ message: 'Token de rafraîchissement invalide ou révoqué' })
        }
        if (error.name === 'InvalidRefreshToken') {
            return res.status(401).json({ message: 'Token de rafraîchissement invalide ou révoqué' });
        }
        
        console.error('Erreur lors du rafraîchissement du token:', error)
        res.status(401).json({ message: 'Token de rafraîchissement invalide' })
    }
}

/**
 * Gère la suppression du compte utilisateur
 * @async
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 * @returns {Object} Confirmation de la suppression
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id
        
        // Recherche de l'utilisateur
        const user = await User.findById(userId)
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        
        // Mise en liste noire du token d'accès actuel
        try {
            const token = req.headers.authorization.split(' ')[1]
            await tokenService.blacklistToken(token)
        } catch (tokenError) {
            console.error('Erreur lors de la mise en liste noire du token:', tokenError)
        }
        
        // Révocation de tous les tokens de l'utilisateur
        try {
            await tokenService.revokeAllUserTokens(userId)
        } catch (revokeError) {
            console.error('Erreur lors de la révocation des tokens:', revokeError)
        }
        
        // Suppression de l'utilisateur et de toutes ses données associées
        await User.findByIdAndDelete(userId)
        await Tweet.deleteMany({ author: userId })
        await Like.deleteMany({ user: userId })
        await Comment.deleteMany({ author: userId })
        
        res.status(200).json({ message: 'Compte supprimé avec succès' })
    } catch (error) {
        console.error('Erreur lors de la suppression du compte:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du compte' })
    }
}

// Export des fonctions du contrôleur pour utilisation dans les routes
module.exports = {
    register,
    login,
    logout,
    getMe,
    refreshToken,
    deleteAccount
}