/**
 * Composant d'en-tête de l'application
 * Gère l'affichage de la barre de navigation supérieure avec recherche et menu utilisateur
 */
'use client';

import {useState} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// import { useAppContext } from '../context/AppContext';
import { useUserContext } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

/**
 * Composant Header réutilisable
 * @returns {JSX.Element} - Composant rendu
 */
export default function Header() {
    // État pour gérer l'ouverture/fermeture du menu déroulant
    const [menuOpen, setMenuOpen] = useState(false);
    // Contexte global de l'application pour accéder aux données utilisateur
    // const { appState, setUser } = useAppContext();
    const { isLoggedIn } = useAuth();
    const { user, setUser } = useUserContext();
    const { accessToken } = useAuth();
    // Hook de navigation
    const router = useRouter();

    /**
     * Gère la déconnexion de l'utilisateur
     * @async
     */
    async function logOut() {
        // Effacement des données utilisateur du contexte
        setUser(null)

        // Appel de l'API de déconnexion
        try {
            const res = await fetch('http://localhost:5000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (err) {
            console.log(err)
        }
        // Fermeture du menu déroulant
        setMenuOpen(false);

        // Redirection vers la page d'accueil
        router.replace('/');
    }
    console.log("User in header:", user)

    return (
        <header className="bg-white shadow-md p-6 flex justify-between items-center fixed top-0 w-full z-50 border-b">
            {/* Logo et titre de l'application */}
            <Link href="/" className="text-2xl font-bold text-blue-600">Rettewt</Link>

            {/* Barre de recherche */}
            <div className="flex-grow mx-4 max-w-lg">
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full p-3 bg-gray-50 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Menu utilisateur (dropdown) */}
            <div className="relative">
                {isLoggedIn ? (
                    // Si l'utilisateur est connecté : affichage de l'avatar ou des initiales
                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center space-x-3">
                        {user?.profile_img ? (
                            <Image
                                src={user?.profile_img || '/placeholder.png'}
                                width={48}
                                height={48}
                                alt="Profile"
                                className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-md"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-md 
                            bg-blue-500 flex items-center justify-center text-white font-bold">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                    </button>
                ) : (
                    // Si l'utilisateur n'est pas connecté : liens de connexion et inscription
                    <div className="flex space-x-4">
                        <Link href="/login" className="text-blue-300 font-semibold">Log In</Link>
                        <Link href="/signup" className="text-blue-600 font-semibold">Sign Up</Link>
                    </div>
                )}

                {/* Menu déroulant (visible uniquement quand menuOpen est true) */}
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                        <Link
                            href="/profile"
                            className="block px-4 py-2 text-black hover:bg-gray-100"
                            onClick={() => setMenuOpen(false)}
                        >
                            Profile
                        </Link>
                        <button
                            className="block w-full text-left text-black px-4 py-2 hover:bg-gray-100 hover:cursor-pointer"
                            onClick={logOut}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}