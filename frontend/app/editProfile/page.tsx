/**
 * Page d'édition de profil
 * Permet à l'utilisateur de modifier ses informations de profil
 */
'use client';

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { gql, useQuery } from "@apollo/client"
import { useAuth } from '@/app/context/AuthContext'
import { useUserContext } from '@/app/context/UserContext'
import Image from 'next/image';

/**
 * Requête GraphQL pour récupérer les informations de l'utilisateur connecté
 */
const GET_USER_INFO = gql`
  query User {
    userTimeline {
      user {
        _id
        username
        email
        profile_img
        bio
      }
    }
  }
`;

/**
 * Composant de la page d'édition de profil
 * @returns {JSX.Element} - Composant rendu
 */
export default function EditProfilePage() {
    // Hook de navigation
    const router = useRouter();
    // Contexte global de l'application pour accéder aux données utilisateur
    const { setUser } = useUserContext();
    const { accessToken } = useAuth();
    // Référence pour l'input de fichier caché
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // États pour gérer le formulaire et les messages
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [bio, setBio] = useState('');
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState<string>('');

    /**
     * Requête GraphQL pour récupérer les données utilisateur
     * Utilise cache-and-network pour toujours avoir des données à jour
     */
    const { data, loading: queryLoading, refetch } = useQuery(GET_USER_INFO, {
        fetchPolicy: "cache-and-network",
        onCompleted: (data) => {
            console.log("✅ Query completed:", data);
        },
        onError: (err) => {
            console.error("❌ GraphQL error:", err)
        }
    });
    
    // Extraction des données utilisateur du résultat de la requête
    const userData = useMemo(() => data?.userTimeline?.user || {}, [data]);

    /**
     * Effet pour initialiser le formulaire avec les données utilisateur
     */
    useEffect(() => {
        if (userData) {
            setBio(userData.bio || '');
            setProfilePicPreview(userData.profile_img || '/placeholder-profile.jpg');
        }
    }, [userData]);

    /**
     * Gère les changements dans le champ de biographie
     * @param {React.ChangeEvent<HTMLTextAreaElement>} e - Événement de changement
     */
    function handleBioChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setBio(e.target.value);
    }

    /**
     * Gère la sélection d'une image de profil
     * @param {React.ChangeEvent<HTMLInputElement>} e - Événement de changement
     */
    function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
            // Création d'une URL de prévisualisation
            const imageUrl = URL.createObjectURL(file);
            setProfilePicPreview(imageUrl);
        }
    }

    /**
     * Gère la soumission du formulaire de mise à jour du profil
     * @async
     */
    async function handleSave() {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Création d'un FormData pour l'envoi multipart
            const formData = new FormData();
            
            // Ajout de la biographie
            formData.append('bio', bio);

            // Ajout de l'image de profil si une nouvelle a été sélectionnée
            if (profilePicFile) {
                formData.append('image', profilePicFile);
            }

            // Appel à l'API REST pour mettre à jour le profil
            const response = await fetch('http://localhost:5000/api/users/update', {
                method: 'PUT',
                body: formData,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            // Analyse de la réponse
            const responseText = await response.text();
            let data;

            // Gestion des erreurs de parsing JSON
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response:', e, responseText);
                throw new Error('Invalid response from server');
            }

            // Gestion des erreurs de l'API
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update profile');
            }

            // Mise à jour des données utilisateur dans le contexte global
            if (setUser && data.user) {
                setUser(data.user);
            }

            // Affichage du message de succès
            setSuccess(true);

            // Actualisation des données GraphQL
            refetch();

            // Redirection vers la page de profil après un court délai
            setTimeout(() => {
                router.push('/profile');
            }, 1500);

        } catch (err) {
            if (err instanceof Error) {
                console.error('Error updating profile:', err);
                setError(err.message || 'An error occurred while updating your profile');
            }
            
        } finally {
            setIsLoading(false);
        }
    }

    // Affichage d'un indicateur de chargement pendant la récupération des données
    if (queryLoading && !data) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="max-w-4xl mx-auto p-4">

                {/* En-tête avec bouton de retour */}
                <div className="relative bg-white p-6 rounded-lg shadow-md flex items-center">
                    <button onClick={() => router.push('/profile')} className="absolute left-4">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 transition" />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">Edit Profile</h1>
                </div>

                {/* Formulaire d'édition */}
                <div className="mt-4 bg-white p-6 rounded-lg shadow-md">
                    {/* Message d'erreur */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Message de succès */}
                    {success && (
                        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                            Profile updated successfully!
                        </div>
                    )}

                    {/* Section de téléchargement d'image de profil */}
                    <div className="flex flex-col items-center">
                        <label htmlFor="profilePic" className="cursor-pointer">
                            {/* Affichage de l'image de profil ou d'un espace réservé */}
                           
                            <Image
                                src={profilePicPreview || '/placeholder-profile.jpg'}
                                alt="Profile"
                                width={24}
                                height={24}
                                className="w-24 h-24 rounded-full object-cover border"
                            /> 
                        </label>
                        <input
                            type="file"
                            id="profilePic"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleProfilePicChange}
                        />
                        <button
                            className="text-sm text-blue-500 mt-2"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Change profile picture
                        </button>
                    </div>

                    {/* Champs du formulaire */}
                    <div className="mt-6 space-y-4">
                        {/* Nom d'utilisateur (lecture seule) */}
                        <div>
                            <label className="block text-gray-600 text-sm">Username (Read-only)</label>
                            <input
                                type="text"
                                value={userData.username || ''}
                                disabled
                                className="w-full p-2 border rounded-md bg-gray-50"
                            />
                        </div>

                        {/* Email (lecture seule) */}
                        <div>
                            <label className="block text-gray-600 text-sm">Email (Read-only)</label>
                            <input
                                type="email"
                                value={userData.email || ''}
                                disabled
                                className="w-full p-2 border rounded-md bg-gray-50"
                            />
                        </div>

                        {/* Biographie (éditable) */}
                        <div>
                            <label className="block text-gray-600 text-sm">Bio</label>
                            <textarea
                                name="bio"
                                value={bio}
                                onChange={handleBioChange}
                                rows={3}
                                className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    {/* Bouton de sauvegarde */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={`${
                                isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                            } text-white px-6 py-2 rounded-full transition flex items-center`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}