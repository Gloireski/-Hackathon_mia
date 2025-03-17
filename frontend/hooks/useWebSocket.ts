'use client'

import { useEffect, useState } from "react"

export default function useWebSocket(url: string, userId: string) {
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [notifications, setNotifications] = useState<any[]>([])

    useEffect(() => {
        if (!userId) return  // Ensure userId is provided before connecting

        const ws = new WebSocket(url)

        ws.onopen = () => {
            console.log("✅ Connected to WebSocket server")
            // Register the user ID on connection
            ws.send(JSON.stringify({ type: "register", userId }))
        }

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            console.log("🔔 Message received:", message)

            setNotifications((prev) => [...prev, message])
        }

        ws.onclose = () => console.log("❌ Disconnected from WebSocket server")
        ws.onerror = (error) => console.error("⚠️ WebSocket error:", error)

        setSocket(ws)

        return () => {
            ws.close()
        }
    }, [url, userId])

    return { notifications, socket }
}
