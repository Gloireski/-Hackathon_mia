'use client'
import { useWebSocketContext } from "@/app/context/WebSocketProvider"
import { useState, useEffect } from 'react'
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Notification } from '../../types/notifications'

export default function Notifications() {
    const { notifications: contextNotifications, markNotificationAsRead, unreadCount } = useWebSocketContext()
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Sync notifications from context
    useEffect(() => {
        setNotifications(contextNotifications)
    }, [contextNotifications])
    
    const markAllAsRead = () => {
        notifications.forEach(notif => {
            if (!notif.read && notif.id) {
                markNotificationAsRead(notif.id)
            }
        })
    }

    const handleMarkAsRead = (notificationId: string) => {
        console.log('Marking notification as read:', notificationId)
        if (notificationId) {
            markNotificationAsRead(notificationId)
        }
    }

    const deleteNotification = (index: number) => {
        setNotifications(notifications.filter((_, i) => i !== index))
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString()
    }

    // Sort notifications: unread first, then by timestamp
    const sortedNotifications = [...notifications].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return (
        <div className="p-6 mt-20 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BellIcon className="h-6 w-6 text-blue-500" />
                        Notifications {unreadCount > 0 && <span className="text-sm text-blue-500">({unreadCount})</span>}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Stay updated with your latest notifications</p>
                </div>
                {unreadCount > 0 && (
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
                    <BellIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No notifications yet</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {sortedNotifications.map((notif) => (
                        <li
                            key={notif.id}
                            className={`p-4 rounded-lg border transition-all ${
                                notif.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className={`text-sm ${notif.read ? 'text-gray-700' : 'text-black font-medium'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {notif.timestamp ? formatTimestamp(notif.timestamp.toString()) : 'Just now'}
                                    </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    {!notif.read && notif.id && (
                                        <button
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Mark as read"
                                        >
                                            <CheckIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(sortedNotifications.indexOf(notif))}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete notification"
                                    >
                                        <TrashIcon className="h-5 w-5" />
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