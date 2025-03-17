/**
 * Page de profil utilisateur
 * Affiche les informations du profil et les différents contenus de l'utilisateur
 */
'use client';

import { useState } from 'react'
import { PencilIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import TweetsList from "@/components/TweetList"
import { gql, useQuery } from "@apollo/client"
import CommentsList from "@/components/CommentsList"
import { GET_USER_INFO } from '../../graphql/queries'

/**
 * Composant de la page de profil
 * Affiche les informations de l'utilisateur et un système d'onglets
 * pour naviguer entre ses différents contenus
 * 
 * @returns {JSX.Element} - Composant rendu
 */
export default function ProfilePage() {
    // État pour gérer l'onglet actif
    const [activeTab, setActiveTab] = useState('posts');

    /**
     * Requête GraphQL pour récupérer les données de l'utilisateur
     * fetchPolicy: "cache-and-network" garantit des données à jour tout en utilisant le cache
     */
    const { data, loading, error } = useQuery(GET_USER_INFO, {
        fetchPolicy: "cache-and-network", // Évite d'afficher des données obsolètes
    });

    // Log des données pour le débogage
    if (data) { console.log(data) }
    if (error) { console.log(error) }

    // Préparation des données pour l'affichage
    const userData = data?.userTimeline?.user || {};
    const tweetsCount = data?.userTimeline?.tweets?.length || 0;
    const followersCount = userData?.followers?.length || 0;
    const followingCount = userData?.followings?.length || 0;

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 pt-22">
            <div className="max-w-4xl mx-auto p-4">
                {/* En-tête du profil */}
                <div className="relative bg-white p-6 rounded-lg shadow-md">
                    {/* Bouton d'édition du profil (coin supérieur droit) */}
                    <Link href="/editProfile">
                        <button className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition">
                            <PencilIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </Link>

                    {/* Informations du profil */}
                    <div className="flex items-center space-x-6">
                        {/* Photo de profil */}
                        <img
                            src={userData.profile_img || "/placeholder-profile.jpg"}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover"
                        />
                        <div>
                            {/* Nom d'utilisateur et bio */}
                            <h1 className="text-xl font-bold">{userData.username || "Username"}</h1>
                            <p className="text-gray-600">{userData.bio || "You don't have a bio yet."}</p>
                            
                            {/* Statistiques (posts, followers, following) */}
                            <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                                <span><strong>{tweetsCount}</strong> Posts</span>
                                <span><strong>{followersCount}</strong> Followers</span>
                                <span><strong>{followingCount}</strong> Following</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Onglets de navigation */}
                <div className="mt-4 flex space-x-4 border-b">
                    {['posts', 'comments', 'liked'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Message d'erreur en cas de problème */}
                {error && (
                    <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
                        <p className="font-bold">Error:</p>
                        <p>{error.message}</p>
                    </div>
                )}

                {/* Contenu des onglets */}
                <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                    {/* Onglet des tweets */}
                    {activeTab === 'posts' && (
                        <div>
                            <TweetsList
                                tweets={data?.userTimeline?.tweets || []}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* Onglet des tweets likés */}
                    {activeTab === 'liked' && (
                        <div>
                            <TweetsList
                                tweets={data?.userTimeline?.likedTweets || []}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* Onglet des commentaires */}
                    {activeTab === 'comments' && (
                        <div>
                            <CommentsList
                                comments={data?.userTimeline?.comments || []}
                                loading={loading}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}