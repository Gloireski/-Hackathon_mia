'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { User } from '@/types/user'
import { GET_USER } from '@/graphql/queries'
import { useQuery } from '@apollo/client'

interface UserContextType {
    user: User | null
    setUser: (user: User | null) => void
    loadingUser: boolean
    refetchUser: () => void
}

const UserContext = createContext<UserContextType | null>(null)

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { accessToken, logout } = useAuth()
    const [user, setUser] = useState<User | null>(null)

    const { data, loading, error, refetch } = useQuery(GET_USER, {
        skip: !accessToken,
        context: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        fetchPolicy: 'network-only', // important pour éviter les données obsolètes
    })

    useEffect(() => {
        if (data?.getCurrentUser) {
            setUser(data.getCurrentUser)
        }
    }, [data])

    useEffect(() => {
        if (error) {
            console.error("GET_USER error:", error)
            // Peut-être une 401 ? Token expiré
            logout()
            setUser(null)
        }
    }, [error])

    return (
        <UserContext.Provider value={{ user, setUser, loadingUser: loading, refetchUser: refetch }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUserContext = () => {
    const context = useContext(UserContext)
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider')
    }
    return context
}
