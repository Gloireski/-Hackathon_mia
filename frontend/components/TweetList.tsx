/**
 * Composant de liste de tweets
 * Affiche une liste de tweets avec la possibilité d'ouvrir un tweet spécifique
 */
"use client"

import { useState, useEffect } from "react"
import { useLazyQuery, useQuery } from "@apollo/client"
import Tweet from "./Tweet"
import TweetModal from "./TweetModal"
import { GET_TWEET } from "../app/graphql/queries"

import { TweetData, Comment } from "../app/type/types"
/**
 * Interface pour les propriétés du composant TweetsList
 * @interface TweetsListProps
 */
interface TweetsListProps {
    tweets: TweetData[];
    loading: boolean;
}

/**
 * Composant affichant une liste de tweets avec gestion d'un modal pour afficher les détails
 * @param {TweetsListProps} props - Propriétés du composant
 * @returns {JSX.Element} - Composant rendu
 */
export default function TweetsList({ tweets, loading }: TweetsListProps) {
    // État pour le tweet sélectionné (affiché dans le modal)
    const [selectedTweet, setSelectedTweet] = useState<TweetData | null>(null);
    // État pour les commentaires du tweet sélectionné
    const [comments, setComments] = useState<Comment[]>([]);

    /**
     * Requête GraphQL pour récupérer les détails d'un tweet
     * fetchPolicy "network-only" pour toujours récupérer les données à jour du serveur
     */
    const [fetchTweet, { data, loading: tweetLoading, error }] = useLazyQuery(GET_TWEET, {
        fetchPolicy: "network-only",
    });
    /**
     * Utilisation de useQuery pour récupérer les détails d'un tweet
     */
    // const { data, loading: tweetLoading, error } = useQuery(GET_TWEET, {
    //     variables: { id: selectedTweet?.id },
    //     skip: !selectedTweet,
    //     fetchPolicy: "network-only",
    // });
    /**
     * Ouvre le modal d'un tweet et charge ses commentaires
     * @param {TweetData} tweet - Tweet à afficher dans le modal
     */
    const openTweet = (tweet: TweetData) => {
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