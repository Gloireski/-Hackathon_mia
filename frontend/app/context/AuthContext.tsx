'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from '@/app/lib/axios'
// import { setAccessToken as setTokenUtil } from '../lib/tokenUtils'

interface AuthContextType {
    accessToken: string | null
    setAccessToken: (token: string | null) => void
    isLoggedIn: boolean
    setIsLoggedIn: (isLoggedIn: boolean) => void
    // refreshAccessToken: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [loading, setLoading] = useState(true)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    // Removed unused refreshToken state

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    console.log("Server URL:", serverUrl)
    const refreshAccessToken = async () => {
        try {
            const res = await axios.post(`${serverUrl}/api/auth/refresh-token`, {}, { withCredentials: true });
            console.log("Refresh token response:", res)
            setAccessToken(res.data.accessToken);
            setIsLoggedIn(true);
        } catch (err) { 
            console.error("Erreur lors du refresh:", err);
            setAccessToken(null);
        } finally {
            setLoading(false);
        }
    };

    // try refresh on first render
    useEffect(() => {
        refreshAccessToken();
    }, []);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, isLoggedIn, setIsLoggedIn, loading }}>
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