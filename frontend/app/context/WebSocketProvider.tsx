"use client"

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react"
import useWebSocket from "../hooks/useWebSocket"
// import { useAppContext } from "./AppContext" // Assuming user data is in context
import { useUserContext } from "./UserContext" 
import { Notification } from "@/types/notifications"

// Create Context
interface WebSocketContextType {
    notifications: Notification[];
    socket: WebSocket | null;
    markNotificationAsRead: (notificationId: string) => void;
    clearNotifications: () => void;
    unreadCount: number;
    unreadNotifications: Notification[];
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

// Provider Component
export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { user } = useUserContext()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    // Calculate unread notifications
    const unreadNotifications = notifications.filter(n => !n.read)

    // WebSocket message handler
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'notification') {
                console.log('Received notification:', data)
                
                // Only process notifications meant for the current user
                if (data.recipientId === user?._id) {
                    // Add new notification to state
                    setNotifications(prev => {
                        // Check if notification already exists
                        const exists = prev.some(n => n.id === data.id)
                        if (exists) return prev
                        
                        const newNotification = {
                            ...data,
                            read: false,
                            receivedAt: new Date().toISOString()
                        }
                        return [...prev, newNotification]
                    })
                } else {
                    console.log('Ignoring notification meant for another user:', data.recipientId)
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error)
        }
    }, [user?._id])

    // Initialize WebSocket with message handler
    const { socket } = useWebSocket({
        url: "ws://localhost:5001",
        userId: user?._id || "",
        onMessage: handleMessage
    })

    // Handle reconnection
    useEffect(() => {
        if (socket) {
            socket.onclose = () => {
                console.log('WebSocket connection closed. Attempting to reconnect...')
                setTimeout(() => {
                    if (user?._id) {
                        console.log('Attempting to reconnect...')
                    }
                }, 5000)
            }
        }
    }, [socket, user?._id])

    // Mark notification as read
    const markNotificationAsRead = useCallback((notificationId: string) => {
        console.log('WebSocketProvider: Marking notification as read:', notificationId)
        
        setNotifications(prev => {
            const updated = prev.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, read: true }
                    : notification
            )
            console.log('Updated notifications:', updated)
            return updated
        })

        // Send message to server to mark notification as read
        if (socket && user?._id) {
            socket.send(JSON.stringify({
                type: 'mark_as_read',
                notificationId,
                userId: user._id
            }))
        }
    }, [socket, user?._id])

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([])
    }, [])

    // Update unread count whenever notifications change
    useEffect(() => {
        const newUnreadCount = notifications.filter(n => !n.read).length
        setUnreadCount(newUnreadCount)
    }, [notifications])

    const contextValue = {
        notifications,
        socket,
        markNotificationAsRead,
        clearNotifications,
        unreadCount,
        unreadNotifications
    }

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    )
}

// Custom Hook to use WebSocket context
export function useWebSocketContext() {
    const context = useContext(WebSocketContext)
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider')
    }
    return context
}
