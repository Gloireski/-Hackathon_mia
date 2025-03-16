// Charger les modules requis
const http = require('http')
const cors = require('cors')
const app = require('./src/app')
const typeDefs = require('./src/graphql/typeDefs')
const resolvers = require('./src/graphql/resolvers')
const connectDB = require('./src/config/db')
const dotenv = require('dotenv')
const { ApolloServer } = require('apollo-server')
const redis = require('./src/config/redis')


// Charger les variables d'environnement
dotenv.config()
const port = process.env.PORT || 5000

// Se connecter à MongoDB
connectDB()

// Configurer CORS pour Apollo Server
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}

// // Initialiser le serveur HTTP
// const httpServer = http.createServer(app)

// // Fonction de démarrage asynchrone
// async function startServer() {
//   // Créer l'instance Apollo Server
//   const apolloServer = new ApolloServer({
//     typeDefs,
//     resolvers,
//     context: ({ req }) => ({ req }),
//     cors: corsOptions
//   })
  
//   // Démarrer Apollo Server
//   await apolloServer.start()
  
//   // Appliquer le middleware Apollo à Express
//   apolloServer.applyMiddleware({ 
//     app, 
//     path: '/graphql',
//     cors: corsOptions 
//   })
  
//   // Démarrer le serveur HTTP
//   httpServer.listen(port, () => {
//     console.log(`🚀 Serveur Express prêt sur http://0.0.0.0:${port}`)
//     console.log(`🚀 Serveur GraphQL prêt sur http://0.0.0.0:${port}${apolloServer.graphqlPath}`)
//   })
// }

// // Démarrer le serveur et gérer les erreurs 
// startServer().catch(err => {
//   console.error('Erreur au démarrage du serveur :', err)
// })

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
})

server.listen().then(({ url }) => {
    console.log(`🚀 Serveur GraphQL prêt sur ${url}`)
})