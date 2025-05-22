/**
 * Composant de liste de tweets
 * Affiche une liste de tweets avec la possibilité d'ouvrir un tweet spécifique
 */
"use client"

import { useState, useEffect } from "react"
import { useLazyQuery } from "@apollo/client"
import Tweet from "./Tweet"
import TweetModal from "./TweetModal"
import { GET_TWEET } from "../graphql/queries"
import { TweetModel } from "@/types/TweetModel"
import { CommentModel } from "../types/types"
import { useFollowingMap } from "@/hooks/useFollowingMap"
/**
 * Interface pour les propriétés du composant TweetsList
 * @interface TweetsListProps
 */
interface TweetsListProps {
    tweets: TweetModel[];
    loading: boolean;
    followingUsers: string[];
}

/**
 * Composant affichant une liste de tweets avec gestion d'un modal pour afficher les détails
 * @param {TweetsListProps} props - Propriétés du composant
 * @returns {JSX.Element} - Composant rendu
 */
export default function TweetsList({ tweets, loading, followingUsers = [] }: TweetsListProps) {
    // État pour le tweet sélectionné (affiché dans le modal)
    const [selectedTweet, setSelectedTweet] = useState<TweetModel | null>(null);
    // État pour les commentaires du tweet sélectionné
    const [comments, setComments] = useState<CommentModel[]>([]);
    // État pour la liste des utilisateurs suivis (sous forme de map pour un accès rapide)
    const { followingMap, toggleFollow} = useFollowingMap(followingUsers || []);

    // console.log("Following users:", followingUsers) // Debug;
    /**
     * Requête GraphQL pour récupérer les détails d'un tweet
     * fetchPolicy "network-only" pour toujours récupérer les données à jour du serveur
     */
    const [fetchTweet, { data, loading: tweetLoading, error }] = useLazyQuery(GET_TWEET, {
        fetchPolicy: "network-only",
    });
    /**
     * Ouvre le modal d'un tweet et charge ses commentaires
     * @param {TweetData} tweet - Tweet à afficher dans le modal
     */
    const openTweet = (tweet: TweetModel) => {
        console.log("Opening tweet:", tweet)
        setSelectedTweet(tweet)
        // setComments([]) // Réinitialise les commentaires avant d'en charger de nouveaux
        fetchTweet({ variables: { id: tweet.id } })
    };

    /**
     * Effet pour mettre à jour les commentaires lorsque les données du tweet sont chargées
     */
    useEffect(() => {
        if (data?.getTweet?.comments) {
            setComments(data.getTweet.comments);
            console.log("Fetched comments:", data.getTweet.comments);
        } else {
            setComments([]); // Réinitialise les commentaires pour éviter d'afficher des anciens
        }
    }, [data, selectedTweet]); // Dépendances : data et selectedTweet

    return (
        <div>
            {/* Indicateur de chargement */}
            {loading && <p className="text-center text-gray-500">Loading...</p>}

            {/* Liste des tweets ou message si aucun tweet */}
            {!loading && tweets.length > 0 ? (
                tweets.map((tweet) => (
                    <div key={tweet.id} onClick={() => openTweet(tweet)}>
                        <Tweet 
                            {...tweet} 
                            isFollowing={!!followingMap[tweet.author._id]}
                            onFollowToggle={toggleFollow}
                        />
                    </div>
                ))
            ) : (
                !loading && <p className="text-center text-gray-500">No tweets available</p>
            )}

            {/* Modal de tweet (affiché lorsqu'un tweet est sélectionné) */}
            {selectedTweet && (
                <TweetModal
                    tweet={selectedTweet}
                    comments={comments}
                    loading={tweetLoading}
                    error={error}
                    onClose={() => setSelectedTweet(null)}
                />
            )}
        </div>
    );
}