/**
 * Configuration principale de l'application Express
 * Initialise le serveur, configure les middlewares et définit les routes
 */
const express = require('express')  // Framework web pour Node.js
const cors = require('cors')  // Middleware pour gérer les requêtes CORS (Cross-Origin Resource Sharing)
const path = require("path")  // Utilitaire pour travailler avec les chemins de fichiers
const dotenv = require('dotenv')  // Chargement des variables d'environnement
const bodyParser = require('body-parser')  // Middleware pour analyser les corps de requêtes HTTP
const fs = require("fs")  // Module pour travailler avec le système de fichiers
const { graphqlUploadExpress } = require('graphql-upload')  // Middleware pour gérer les uploads avec GraphQL
const cookieParser = require("cookie-parser");


// Import des routes de l'application
const tweetsRoute = require('./routes/tweetsRoute')  // Routes pour les tweets
const usersRoute = require('./routes/usersRoute')  // Routes pour les utilisateurs
const authRoutes = require('./routes/authRoutes')  // Routes d'authentification
const adminRoutes = require('./routes/adminRoutes')  // Routes d'administration

// Chargement des variables d'environnement
dotenv.config()

// Création de l'application Express
const app = express()

// Configuration des middlewares
app.use(bodyParser.json())  // Analyse des requêtes JSON
app.use(express.json())  // Alternative à bodyParser pour les requêtes JSON
app.use(express.urlencoded({ extended: true }))  // Analyse des données URL-encoded
app.use(cors(
    {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",  // Autorise les requêtes depuis l'URL du frontend
        credentials: true,  // Autorise les cookies et les informations d'authentification
    }
))  // Activation du CORS pour permettre les requêtes cross-origin
app.use(cookieParser());  // Middleware pour analyser les cookies

app.post("/api/auth/debug-token", (req, res) => {
  console.log("Cookies:", req.cookies); // Assure-toi que cookie-parser est utilisé
  res.json({ cookies: req.cookies });
});

// Configuration spécifique pour les routes d'API
app.use("/api", express.json());  // Analyse JSON pour les routes /api
app.use("/api", express.urlencoded({ extended: true }));  // Analyse URL-encoded pour les routes /api

// Enregistrement des routes de l'application
app.use('/api/tweets', tweetsRoute)  // Montage des routes de tweets
app.use('/api/users', usersRoute)  // Montage des routes d'utilisateurs
app.use('/api/auth', authRoutes)  // Montage des routes d'authentification
app.use('/api/admin', adminRoutes)  // Montage des routes d'administration

// Servir les fichiers statiques du dossier uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Configuration du middleware d'upload pour GraphQL
app.use("/graphql", graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 5 }));  // Limite: 10MB par fichier, max 5 fichiers

// Export de l'application configurée
module.exports = app