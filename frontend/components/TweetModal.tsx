/**
 * Composant de modal pour afficher un tweet et ses commentaires
 * Permet également d'ajouter des commentaires
 */
"use client"

import {
    HeartIcon,
    ChatBubbleOvalLeftIcon,
    ArrowPathIcon,
    XMarkIcon
} from "@heroicons/react/24/outline"
import { useRef, useEffect, useState } from "react"
import { useAppContext } from "@/app/context/AppContext"
import { CommentModel } from "@/types/types"
import { TweetModel } from "@/types/TweetModel"
import { timeAgo } from "@/utils/timeAgo"
import Image from "next/image"

/**
 * Interface pour les propriétés du composant TweetModal
 * @interface TweetModalProps
 */
interface TweetModalProps {
    tweet: TweetModel
    comments: CommentModel[]
    onClose: () => void
    loading: boolean
    error: Error | undefined
}

/**
 * Composant modal pour afficher un tweet et ses interactions
 * @param {TweetModalProps} props - Propriétés du composant
 * @returns {JSX.Element} - Composant rendu
 */
export default function TweetModal({ tweet, comments, loading, error, onClose }: TweetModalProps) {
    // États pour la gestion des commentaires
    const [newComment, setNewComment] = useState("")
    const [commentList, setCommentList] = useState<CommentModel[]>(comments)
    const [isSubmitting, setIsSubmitting] = useState(false)
    console.log("comments", commentList)// Debug
    
    // Référence pour le champ de saisie de commentaire
    const commentInputRef = useRef<HTMLTextAreaElement>(null)
    
    // Contexte global de l'application
    const {appState} = useAppContext()

    // Effet pour mettre à jour la liste des commentaires
    useEffect(() => {
        setCommentList(comments);
    }, [comments]);    

    /**
     * Effet pour mettre le focus dans le champ de saisie au montage du modal
     */
    useEffect(() => {
        if (commentInputRef.current) {
            commentInputRef.current.focus()
        }
    }, []);

    /**
     * Gère la soumission d'un nouveau commentaire
     * @async
     */
    const handleCommentSubmit = async () => {
        // Vérification qu'il y a un commentaire à soumettre et qu'on n'est pas déjà en train de soumettre
        if (!newComment.trim() || isSubmitting) return

        setIsSubmitting(true);
      
        try {
            // Appel à l'API REST pour ajouter un commentaire
            const response = await fetch(`http://localhost:5000/api/tweets/${tweet.id}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${appState?.token}`,
                },
                body: JSON.stringify({ content: newComment }),
            });

            console.log("Réponse API:", response); // Debug

            // Gestion des erreurs de l'API
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erreur API:", errorData);
                throw new Error(errorData.message || "Erreur lors de l'ajout du commentaire");
            }

            // Ajout du commentaire à la liste locale
            const savedComment = await response.json();
            setCommentList([savedComment, ...commentList]); // Ajout en haut de la liste
            setNewComment(""); // Réinitialisation du champ de saisie
        } catch (error) {
            console.error("Erreur:", error);
            if (error instanceof Error) {
                alert(`Impossible d'ajouter le commentaire : ${error.message}`);
            } else {
                alert("Impossible d'ajouter le commentaire : Une erreur inconnue s'est produite.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 flex justify-center items-start overflow-y-auto pt-22"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-2xl rounded-xl shadow-lg mt-10 relative p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Bouton de fermeture */}
                <button
                    onClick={onClose}
                    className="absolute top-3 left-3 text-gray-500 hover:text-gray-700 transition"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Contenu du tweet */}
                <div className="border-b pb-4">
                    <div className="flex gap-3">
                        {/* Image de profil de l'auteur */}
                        <Image
                            src={tweet.author.profile_img || "/placeholder.png"}
                            alt={`${tweet.author.username}'s profile`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        {/* Informations sur l'auteur et le tweet */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{tweet.author?.username}</span>
                                <span className="text-gray-500">@{tweet.author?.handle}</span>
                                <span className="text-gray-500">· {timeAgo(tweet.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-lg">{tweet.content}</p>
                        </div>
                    </div>
                </div>

                {/* Actions sur le tweet (non-fonctionnelles dans le modal) */}
                <div className="flex justify-around py-3 border-b text-gray-500">
                    <button className="flex items-center gap-2 hover:text-blue-500">
                        <ChatBubbleOvalLeftIcon className="w-5 h-5" />
                        <span>Reply</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-green-500">
                        <ArrowPathIcon className="w-5 h-5" />
                        <span>Retweet</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-red-500">
                        <HeartIcon className="w-5 h-5" />
                        <span>Like</span>
                    </button>
                </div>

                {/* Formulaire d'ajout de commentaire */}
                <div className="pt-4">
                    <h4 className="font-semibold text-lg">Ajouter un commentaire</h4>
                    <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Écrire un commentaire..."
                        className="w-full border rounded p-2 mt-2"
                    ></textarea>
                    <button
                        onClick={handleCommentSubmit}
                        className={`bg-blue-500 text-white px-4 py-2 mt-2 rounded ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Envoi..." : "Commenter"}
                    </button>
                </div>

                {/* Liste des commentaires */}
                {loading? <p className="text-center text-gray-500 mt-4">Chargement...</p> : (
                <div className="space-y-4 pt-4">
                    <h4 className="font-semibold text-lg">Commentaires</h4>
                    {commentList.length > 0 ? (
                        commentList.map((comment, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                    {/* Image de profil de l'auteur du commentaire */}
                                    {comment.author?.profile_img?
                                    <Image 
                                        src={comment.author?.profile_img || "/placeholder.png"} 
                                        alt="Profile" 
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full"
                                    /> :
                                    <div className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-md 
                                    bg-blue-500 flex items-center justify-center text-white font-bold">
                                        {comment?.author?.username.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    }
                                    <div>
                                        <span className="font-bold">{comment.author?.username}</span>
                                        <span className="text-gray-500 text-sm"> @{comment.author?.handle}</span>
                                    </div>
                                </div>
                                <p className="text-gray-700 mt-2">{comment.content}</p>
                                <span className="text-gray-500 text-xs">{timeAgo(comment.createdAt)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">Aucun commentaire pour l&apos;instant.</p>
                    )}
                </div>
                )}
                {error && <p className="text-red-500 text-center mt-4">{error.message}</p>}
            </div>
        </div>
    );
}