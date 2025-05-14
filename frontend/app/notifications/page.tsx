'use client'
import { useWebSocketContext } from "@/app/context/WebSocketProvider"
import { useState } from 'react'
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function Notifications() {
    const webSocketContext = useWebSocketContext()
    const [notifications, setNotifications] = useState(webSocketContext?.notifications || [])
    
    const markAllAsRead = () => {
        setNotifications(notifications.map(notif => ({ ...notif, read: true })))
    }

    const markAsRead = (index: number) => {
        const updatedNotifications = [...notifications]
        updatedNotifications[index] = { 
            ...updatedNotifications[index],
            read: true as const 
        }
        setNotifications(updatedNotifications)
    }

    const deleteNotification = (index: number) => {
        setNotifications(notifications.filter((_, i) => i !== index))
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString()
    }

    return (
        <div className="p-6 mt-20 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BellIcon className="text-blue-500" />
                        Notifications
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Stay updated with your latest notifications</p>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BellIcon className="mx-auto text-4xl text-gray-400 mb-3" />
                    <p className="text-gray-500">No notifications yet</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {notifications.map((notif, index) => (
                        <li
                            key={index}
                            className={`p-4 rounded-lg border transition-all ${
                                notif.read ? 'bg-white' : 'bg-blue-50'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className={`text-sm ${notif.read ? 'text-gray-700' : 'text-black font-medium'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {notif.timestamp ? formatTimestamp(notif.timestamp) : 'Just now'}
                                    </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    {!notif.read && (
                                        <button
                                            onClick={() => markAsRead(index)}
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Mark as read"
                                        >
                                            <CheckIcon className="text-xl" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(index)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete notification"
                                    >
                                        <TrashIcon className="text-xl" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}