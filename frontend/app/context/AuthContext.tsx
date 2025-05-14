'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from '@/app/lib/axios'
// import { setAccessToken as setTokenUtil } from '../lib/tokenUtils'
import { setAccessToken as setTokenUtil, setAuthFailed as setGlobalAuthFailed } from '@/app/lib/tokenUtils';


interface AuthContextType {
    accessToken: string | null
    setAccessToken: (token: string | null) => void
    isLoggedIn: boolean
    setIsLoggedIn: (isLoggedIn: boolean) => void
    authFailed: boolean
    setAuthFailed: (authFailed: boolean) => void
    loading: boolean
    login: (token: string) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [loading, setLoading] = useState(true)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [authFailed, setAuthFailed] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    // Removed unused refreshToken state

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

    const login = (token: string) => {
        setAccessToken(token)
        setIsLoggedIn(true)
        setAuthFailed(false)
    }
    
    const logout = () => {
    setAccessToken(null)
    setIsLoggedIn(false)
    setAuthFailed(false)
    }

    const refreshAccessToken = async () => {
        try {
            const res = await axios.post(`${serverUrl}/api/auth/refresh-token`, {}, { withCredentials: true });
            setAccessToken(res.data.accessToken);
            setIsLoggedIn(true);
        } catch (err) {  
            console.error("Erreur lors du refresh:", err);
            logout();
            setAuthFailed(true);
        } finally {
            setLoading(false);
        }
    };

    // try refresh on first render
    useEffect(() => {
        refreshAccessToken();
    }, []);

    useEffect(() => {
        setTokenUtil(accessToken);
    }, [accessToken]);

    useEffect(() => {
        setGlobalAuthFailed(authFailed);
    }, [authFailed]);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, isLoggedIn,
        setIsLoggedIn, authFailed, setAuthFailed, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
        const context = useContext(AuthContext);
        if (!context) {
            throw new Error('useAuth must be used within an AuthProvider');
        }
        return context;
}