'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { User } from '@/types/user'
import { GET_USER } from '@/graphql/queries'
import { useQuery } from '@apollo/client'

interface userContextType {
    user: User | null
    setUser: (user: User | null) => void
}
const UserContext = createContext<userContextType | null>(null);

export const UserProvider = ({ children } : { children: ReactNode}) => {
    const [user, setUser] = useState<User | null>(null)
    const { accessToken } = useAuth()

    const { data, loading } = useQuery(GET_USER, {
        skip: !accessToken,
        context: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });

    useEffect(() => {
        if (data?.getCurrentUser) {
            console.log("Fetched user:", data.getCurrentUser);
            setUser(data.getCurrentUser);
        }
    }, [data]);

    if (accessToken && loading) {
        return <div>Loading user...</div>; // ou spinner
    }

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}