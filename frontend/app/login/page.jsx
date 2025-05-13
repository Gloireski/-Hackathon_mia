/**
 * Page de connexion
 * Permet à l'utilisateur de se connecter à l'application
 */
'use client';

import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useRouter } from "next/navigation"
import { LOGIN_MUTATION } from '../../graphql/mutations'
// import { useMutation } from "@apollo/client"
import { useMutation } from "@tanstack/react-query";
import axios from '@/app/lib/axios';
import { useAuth } from '../context/AuthContext';
import { useUserContext } from '../context/UserContext'

/**
 * Composant de la page de connexion
 * Gère le formulaire de connexion et l'authentification via GraphQL
 * 
 * @returns {JSX.Element} - Composant rendu
 */
export default function LoginPage() {
    // États pour gérer le formulaire
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const { setAccessToken, setIsLoggedIn } = useAuth()
    const { setUser } = useUserContext()

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    // console.log("Server URL:", serverUrl);

    const mutation = useMutation({
        mutationFn: async ({ email, password }) => {
            const res = await axios.post(`${serverUrl}/api/auth/login`, {
                email,
                password
            }, {withCredentials: true});

            const data = await res.data;

            if (res.status !== 200) {
                throw new Error(data.message || 'Login failed');
            }
            return data;
        },

        onMutate: (variables) => {
            console.log("Login attempt:", variables);
        },
    })
        

    // Hook Apollo pour la mutation de connexion
    // const [login, { data, loading, error }] = useMutation(LOGIN_MUTATION)

    // Hooks pour la navigation et le contexte global
    const router = useRouter()

    /**
     * Gère la soumission du formulaire de connexion
     * @param {React.FormEvent} e - Événement de soumission du formulaire
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation du formulaire
        if (!email || !password) {
            setErrorMessage('Please fill in both fields');
            return;
        }
        // setIsLoading(true);
        setErrorMessage('');

        try {
            
            // Utilisation de la mutation GraphQL pour la connexion
            // const { data, loading } = await login({ variables: { email, password } })
            mutation.mutate({ email, password }, {
                onSuccess: (data) => {
                    console.log("Login successful:", data);
                    setAccessToken(data.tokens.accessToken);
                    setIsLoggedIn(true);
                    setUser(data.user);
                    router.replace('/'); // Redirection vers la page d'accueil
                },
            });

            // Si la connexion réussit, mise à jour du contexte et redirection
            
        } catch (error) {
            console.error("Login Failed:", error.message);
            setErrorMessage('An error occurred during login. Please try again.');
        } 
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 pt-22 flex items-center justify-center">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h1>

                {/* Affichage des erreurs */}
                {mutation.error && (
                    <div className="text-red-500 text-sm text-center mb-4">
                        {mutation.error.message}
                    </div>
                )}

                {/* Formulaire de connexion */}
                <form onSubmit={handleSubmit}>
                    {/* Champ pour l'email */}
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-600">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Champ pour le mot de passe */}
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-600">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* Bouton de soumission */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-200"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Lien pour mot de passe oublié */}
                <div className="mt-4 text-center">
                    <a href="/forgot-password" className="text-sm text-blue-500 hover:underline">Forgot your password?</a>
                </div>

                {/* Lien pour l'inscription */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">Don't have an account yet? <a href="/signup" className="text-blue-500 hover:underline">Sign up here</a></p>
                </div>
            </div>
        </div>
    );
}