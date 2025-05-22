/**
 * Composant d'en-tête de l'application
 * Gère l'affichage de la barre de navigation supérieure avec recherche et menu utilisateur
 */
'use client';

import {useState, useEffect, useCallback} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// import { useAppContext } from '../context/AppContext';
import { useUserContext } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import { setAccessToken } from '../lib/tokenUtils';
import { useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import debounce from 'lodash/debounce';
import { SearchResult, SearchData } from '../types/search';

// Define the search query
const SEARCH_QUERY = gql`
  query Search($query: String!) {
    searchTweets(query: $query) {
      id
      content
      createdAt
      author {
        _id
        username
        handle
        profile_img
      }
    }
  }
`;

/**
 * Composant Header réutilisable
 * @returns {JSX.Element} - Composant rendu
 */
export default function Header() {
    // État pour gérer l'ouverture/fermeture du menu déroulant
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    
    // Contexte global de l'application pour accéder aux données utilisateur
    // const { appState, setUser } = useAppContext();
    const { isLoggedIn } = useAuth();
    const { user, setUser } = useUserContext();
    const { accessToken, setIsLoggedIn } = useAuth();
    // Hook de navigation
    const router = useRouter();

    // Initialize the search query
    const [executeSearch, { loading, data }] = useLazyQuery<SearchData>(SEARCH_QUERY);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((searchQuery: string) => {
            if (searchQuery.trim()) {
                executeSearch({ variables: { query: searchQuery } });
            } else {
                setSearchResults([]);
            }
        }, 300),
        []
    );

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    // Update search results when data changes
    useEffect(() => {
        if (data?.searchTweets) {
            setSearchResults(data.searchTweets);
            setShowResults(true);
        }
    }, [data]);

    // Handle clicking outside search results
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.search-container')) {
                setShowResults(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    /**
     * Gère la déconnexion de l'utilisateur
     * @async
     */
    async function logOut() {
        // Effacement des données utilisateur du contexte
        setUser(null);
        setIsLoggedIn(false);
        setAccessToken(null)

        // Appel de l'API de déconnexion
        try {
            const res = await fetch('http://localhost:5000/api/auth/logout', {
                method: 'POST',
                credentials: 'include', // Assurez-vous d'inclure les cookies
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Logout failed');
            }
        } catch (err) {
            console.log(err)
        }
        // Fermeture du menu déroulant
        setMenuOpen(false);

        // Redirection vers la page d'accueil
        router.replace('/');
    }
    // console.log("User in header:", user)

    return (
        <header className="bg-white shadow-md p-6 flex justify-between items-center fixed top-0 w-full z-50 border-b">
            {/* Logo et titre de l'application */}
            <Link href="/" className="text-2xl font-bold text-blue-600">Rettewt</Link>

            {/* Barre de recherche avec résultats */}
            <div className="flex-grow mx-4 max-w-lg relative search-container">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search tweets and users..."
                    className="w-full p-3 bg-gray-50 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Search results dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                        {searchResults.map((result) => (
                            <Link
                                key={result.id}
                                href={`/tweet/${result.id}`}
                                className="block p-3 hover:bg-gray-50 border-b last:border-b-0"
                                onClick={() => setShowResults(false)}
                            >
                                <div className="flex items-center">
                                    <Image
                                        src={result.author.profile_img || '/placeholder.png'}
                                        width={40}
                                        height={40}
                                        alt={result.author.username}
                                        className="rounded-full"
                                    />
                                    <div className="ml-3">
                                        <p className="font-semibold">{result.author.username}</p>
                                        <p className="text-sm text-gray-600">{result.content}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Loading indicator */}
                {loading && (
                    <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                )}
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