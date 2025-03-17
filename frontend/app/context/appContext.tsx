/**
 * Contexte global de l'application
 * Gère l'état partagé entre les composants (données utilisateur, thème, etc.)
 */
'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react'
import { User } from '../../type/user'
import { jwtDecode } from 'jwt-decode'


/**
 * Interface définissant la structure du contexte de l'application
 * @interface AppContextType
 */
interface AppContextType {
    query: string                                   // Requête de recherche
    setQuery: (query: string) => void               // Fonction pour définir la requête
    isLoading: boolean                              // État de chargement global
    setIsLoading: (isLoading: boolean) => void      // Fonction pour définir l'état de chargement
    error: Error | null                            // Erreur globale
    setError: (error: Error | null) => void         // Fonction pour définir l'erreur
    appState: AppState | null                       // État global de l'application
    setAppState: (appState: AppState) => void       // Fonction pour définir l'état global
    setUser: (user: User | null, token: string | null) => void // Fonction pour définir l'utilisateur
    logout: () => void                             // Fonction pour déconnecter l'utilisateur
}

/**
 * Interface définissant la structure de l'état global de l'application
 * @interface AppState
 */
interface AppState {
    theme: string;           // Thème actuel (light, dark, etc.)
    user: User | null;       // Données de l'utilisateur connecté
    isLoggedIn: boolean;     // Si un utilisateur est connecté
    token: string | null;    // Token d'authentification
}

/**
 * État par défaut de l'application
 */
const defaultState: AppState = {
    theme: 'light',
    user: null,
    isLoggedIn: false,
    token: null,
};
function isTokenExpired(token: string | null) {
    if (!token) return true; // Treat missing token as expired
    try {
        const decoded: any = jwtDecode(token)
        return decoded.exp * 1000 < Date.now()
    } catch (error) {
        return true; // Invalid token should be treated as expired
    }
}
/**
 * Création du contexte avec une valeur initiale undefined
 */
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Fournisseur du contexte de l'application
 * @param {Object} props - Propriétés du composant
 * @param {ReactNode} props.children - Composants enfants à envelopper
 * @returns {JSX.Element} - Composant Context.Provider configuré
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
    // États pour les différentes propriétés du contexte
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [appState, setAppState] = useState<AppState | null>(null);

    /**
     * Effet pour charger l'état depuis localStorage au montage du composant
     * Évite les accès à localStorage pendant le rendu côté serveur (SSR)
     */
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedState = localStorage.getItem('appState');
            const parsedState = savedState ? JSON.parse(savedState) : defaultState;

            // Check if token is expired
            if (isTokenExpired(parsedState.token)) {
                logout();
            } else {
                setAppState(parsedState);
            }
        }
    }, []);

    /**
     * Effet pour sauvegarder l'état dans localStorage à chaque modification
     */
    useEffect(() => {
        if (appState) {
            localStorage.setItem('appState', JSON.stringify(appState));
        }
        console.log(appState)
    }, [appState]);

    /**
     * Met à jour l'utilisateur et le token dans l'état global
     * @param {User|null} user - Utilisateur connecté ou null
     * @param {string|null} token - Token d'authentification ou null
     */
    const setUser = (user: User | null, token: string | null) => {
        if (isTokenExpired(token)) {
            logout()
            return
        }
        setAppState(prevState => ({
            ...prevState!,
            user,
            token,
            isLoggedIn: !!user,
        }));
    }

    // Logout function
    const logout = () => {
        setAppState(defaultState)
        localStorage.removeItem('appState')
    }

    // Automatically log out when token expires
        useEffect(() => {
            if (appState?.token) {
                const expiryTime = jwtDecode<any>(appState.token).exp * 1000
                console.log('Token expires at:', new Date(expiryTime))
                const timeout = expiryTime - Date.now();
    
                if (timeout > 0) {
                    const timer = setTimeout(logout, timeout)
                    return () => clearTimeout(timer) // Cleanup on unmount
                } else {
                    logout()
                }
            }
        }, [appState?.token])

    // Valeur du contexte à fournir aux composants enfants
    return (
        <AppContext.Provider value={{
            query,
            setQuery,
            isLoading,
            setIsLoading,
            error,
            setError,
            appState: appState ?? defaultState, // Utilise defaultState si appState est null
            setAppState,
            setUser,
            logout
        }}>
            {children}
        </AppContext.Provider>
    );
};

/**
 * Hook personnalisé pour utiliser le contexte de l'application
 * @returns {AppContextType} - Le contexte de l'application
 * @throws {Error} - Si utilisé en dehors d'un AppProvider
 */
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};