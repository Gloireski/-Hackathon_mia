"use client"

import { createContext, useContext, ReactNode } from "react"
import useWebSocket from "@/hooks/useWebSocket"
import { useAppContext } from "./AppContext" // Assuming user data is in context

// Create Context
const WebSocketContext = createContext<any>(null)

// Provider Component
export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { appState } = useAppContext()
    const userId = appState?.user?._id // Retrieve user ID from global state

    const { notifications, socket } = useWebSocket("ws://localhost:5001", userId)

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
