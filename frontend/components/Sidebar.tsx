'use client'
/**
 * Composant de barre latérale
 * Affiche une navigation principale et des liens vers les différentes sections de l'application
 * @returns {JSX.Element} - Composant rendu
 */
import { HomeIcon, HashtagIcon, BellIcon, EnvelopeIcon, UserIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import SuggestedProfiles from "./SuggestedProfiles"
import { useWebSocketContext } from "@/app/context/WebSocketProvider"
import { useEffect } from 'react'

export default function Sidebar() {
    const { unreadNotifications } = useWebSocketContext()
    
    // Animation effect when new notifications arrive
    useEffect(() => {
        const badge = document.getElementById('notification-badge')
        if (badge && unreadNotifications.length > 0) {
            badge.classList.add('scale-110')
            setTimeout(() => {
                badge.classList.remove('scale-110')
            }, 200)
        }
    }, [unreadNotifications.length])

    return (
        <div className="w-72 min-h-screen p-6 border-r bg-white shadow-md pt-11">
            {/* Navigation principale */}
            <nav className="space-y-3">
                {/* Liste des éléments de navigation avec leurs icônes */}
                {[
                    { icon: <HomeIcon className="h-6 w-6" />, text: "Accueil" },
                    { icon: <HashtagIcon className="h-6 w-6" />, text: "Explorer" },
                    { 
                        icon: <div className="relative">
                            <BellIcon className="h-6 w-6" />
                            {unreadNotifications.length > 0 && (
                                <span 
                                    id="notification-badge"
                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transition-transform duration-200"
                                    title={`${unreadNotifications.length} notifications non lues`}
                                    aria-label={`${unreadNotifications.length} notifications non lues`}
                                >
                                    {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                                </span>
                            )}
                        </div>,
                        text: "Notifications",
                        hasNotification: unreadNotifications.length > 0
                    },
                    { icon: <EnvelopeIcon className="h-6 w-6" />, text: "Messages" },
                    { icon: <UserIcon className="h-6 w-6" />, text: "Profil" }
                ].map((item, index) => (
                    <Link
                        key={index}
                        href={item.text.toLowerCase()}
                        className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 w-full transition-all text-gray-900 font-medium relative group ${
                            item.hasNotification ? 'hover:bg-red-50' : ''
                        }`}
                    >
                        <span className={`${item.hasNotification ? 'text-red-500' : ''}`}> 
                            {item.icon} 
                        </span>
                        <span className={`text-lg ${item.hasNotification ? 'text-red-500 font-semibold' : ''}`}>
                            {item.text}
                        </span>
                        {item.hasNotification && (
                            <span className="absolute right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </Link>
                ))}
            </nav>
            {/* Note: Le composant SuggestedProfiles est importé mais non utilisé dans ce rendu */}
        </div>
    );
}