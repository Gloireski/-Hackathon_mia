"use client"

import { createContext, useContext, ReactNode } from "react"
import useWebSocket from "@/hooks/useWebSocket"
// import { useAppContext } from "./AppContext" // Assuming user data is in context
import { useUserContext } from "./UserContext" 

// Create Context
interface WebSocketContextType {
    notifications: { id: string; message: string; timestamp: Date }[];
    socket: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

// Provider Component
export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { user } = useUserContext()

    const { notifications, socket } = useWebSocket("ws://localhost:5001", user?._id || "")

    return (
        <WebSocketContext.Provider value={{ notifications, socket }}>
            {children}
        </WebSocketContext.Provider>
    )
}

// Custom Hook to use WebSocket context
export function useWebSocketContext() {
    return useContext(WebSocketContext)
}
