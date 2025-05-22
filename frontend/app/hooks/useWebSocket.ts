import { useState, useEffect, useCallback } from 'react'
import { Notification } from '@/types/notifications'

interface UseWebSocketReturn {
    socket: WebSocket | null;
}

interface UseWebSocketParams {
    url: string;
    userId: string;
    onMessage?: (event: MessageEvent) => void;
}

export default function useWebSocket({
    url,
    userId,
    onMessage
}: UseWebSocketParams): UseWebSocketReturn {
    const [socket, setSocket] = useState<WebSocket | null>(null)

    // Create WebSocket connection
    useEffect(() => {
        if (!userId) return

        const ws = new WebSocket(url)

        ws.onopen = () => {
            console.log('WebSocket Connected')
            // Register the client
            ws.send(JSON.stringify({
                type: 'register',
                userId
            }))
        }

        ws.onmessage = (event) => {
            if (onMessage) {
                onMessage(event)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        setSocket(ws)

        // Cleanup on unmount
        return () => {
            ws.close()
        }
    }, [url, userId, onMessage])

    return { socket }
} 