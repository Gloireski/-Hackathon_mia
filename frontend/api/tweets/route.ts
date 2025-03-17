/**
 * API Route pour gérer les tweets
 * Route API Next.js pour la création et récupération de tweets
 */
import { NextResponse } from "next/server";
import fs from "fs/promises"; // Utilisation asynchrone des opérations de système de fichiers
import path from "path";

// Définition du chemin vers le fichier JSON stockant les tweets
const filePath = path.join(process.cwd(), "public/tweet.json");

/**
 * Lit les tweets depuis le fichier JSON
 * @async
 * @returns {Promise<Object>} Les tweets stockés dans le fichier JSON
 */
const readTweets = async () => {
  try {
    // Vérification de l'existence du fichier avant de le lire
    await fs.access(filePath);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erreur de lecture du fichier :", error);
    // Retourne une structure vide pour éviter les erreurs
    return { tweets: [] }; 
  }
};

/**
 * Gestionnaire de la méthode GET
 * Récupère tous les tweets stockés
 * @async
 * @returns {Promise<NextResponse>} Réponse contenant les tweets
 */
export async function GET() {
  const tweets = await readTweets();
  return NextResponse.json(tweets);
}

/**
 * Gestionnaire de la méthode POST
 * Ajoute un nouveau tweet
 * @async
 * @param {Request} req - Objet de requête
 * @returns {Promise<NextResponse>} Réponse contenant le nouveau tweet ou une erreur
 */
export async function POST(req: Request) {
  try {
    // Extraction des données du corps de la requête
    const { username, handle, content } = await req.json();

    // Validation des données
    if (!content) {
      return NextResponse.json({ error: "Le contenu est obligatoire" }, { status: 400 });
    }

    // Lecture des tweets existants
    const tweets = await readTweets();
    
    // Création d'un nouveau tweet
    const newTweet = {
      username: username || "Anonyme",
      handle: handle || "@anonymous",
      content,
      time: new Date().toLocaleTimeString(),
      isFollowing: false,
    };

    // Ajout du nouveau tweet au début du tableau
    tweets.tweets.unshift(newTweet);

    // Sauvegarde dans le fichier JSON
    await fs.writeFile(filePath, JSON.stringify(tweets, null, 2), "utf-8");

    // Retour du tweet créé
    return NextResponse.json(newTweet, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement :", error);
    return NextResponse.json({ error: "Impossible de sauvegarder le tweet" }, { status: 500 });
  }
}