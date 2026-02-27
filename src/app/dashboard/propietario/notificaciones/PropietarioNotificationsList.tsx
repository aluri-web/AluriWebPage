'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertTriangle, Bell, CheckCheck } from 'lucide-react'
import { markAsRead, markAllAsRead, Notificacion } from './actions'

interface Props {
  notifications: Notificacion[]
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days}d`
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function getNotificationIcon(tipo: string) {
  switch (tipo) {
    case 'inversion_aprobada':
      return <CheckCircle size={20} />
    case 'inversion_rechazada':
      return <XCircle size={20} />
    case 'credito_eliminado':
    case 'credito_no_colocado':
      return <AlertTriangle size={20} />
    default:
      return <Bell size={20} />
  }
}

function getNotificationColor(tipo: string) {
  switch (tipo) {
    case 'inversion_aprobada':
      return 'bg-emerald-50 text-emerald-600'
    case 'inversion_rechazada':
      return 'bg-red-50 text-red-600'
    case 'credito_eliminado':
    case 'credito_no_colocado':
      return 'bg-amber-50 text-amber-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

export default function PropietarioNotificationsList({ notifications }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const hasUnread = notifications.some(n => !n.leida)

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      await markAsRead(notificationId)
      router.refresh()
    })
  }

  const handleMarkAllAsRead = () => {
    setMarkingAllRead(true)
    startTransition(async () => {
      await markAllAsRead()
      router.refresh()
      setMarkingAllRead(false)
    })
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
        <Bell size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg font-medium">Sin notificaciones</p>
        <p className="text-gray-400 text-sm mt-1">Las notificaciones aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAllRead || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Marcar todo como leído
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
            disabled={notification.leida && isPending}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              notification.leida
                ? 'bg-gray-50 border-gray-100'
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${getNotificationColor(notification.tipo)}`}>
                {getNotificationIcon(notification.tipo)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${notification.leida ? 'text-gray-400' : 'text-gray-900'}`}>
                    {notification.titulo}
                  </h3>
                  {!notification.leida && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className={`text-sm mt-1 leading-relaxed whitespace-pre-line ${notification.leida ? 'text-gray-400' : 'text-gray-600'}`}>
                  {notification.mensaje}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {timeAgo(notification.created_at)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
