'use client'
import { useWebSocketContext } from "@/app/context/WebSocketProvider"

export default function Notifications() {
    const { notifications } = useWebSocketContext()
    console.log(notifications)

    return (
        <div className="p-4 mt-20">
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-600">Liste des notifications reçues</p>
            <ul className="mt-4">
                {/* {notifications.map((notif, index) => (
                    <li key={index} className="p-2 bg-gray-200 my-2 rounded">
                        <p className="text-sm font-semibold text-black">{notif.message}</p>
                    </li>
                ))} */}
                {notifications.map((notif, index) => {
                    return (
                        <li key={index} className="p-2 bg-gray-200 my-2 rounded">
                            <p className="text-sm font-semibold text-black">{notif.message}</p>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}