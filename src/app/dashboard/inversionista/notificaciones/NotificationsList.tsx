'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertTriangle, Bell, CheckCheck } from 'lucide-react'
import { markAsRead, markAllAsRead, Notificacion } from './actions'

interface NotificationsListProps {
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

export default function NotificationsList({ notifications }: NotificationsListProps) {
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
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-900 rounded-xl border border-zinc-800">
        <Bell size={48} className="text-zinc-700 mb-4" />
        <p className="text-zinc-400 text-lg font-medium">Sin notificaciones</p>
        <p className="text-zinc-600 text-sm mt-1">Las notificaciones aparecerán aquí</p>
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
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Marcar todo como leído
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => {
          const tipo = notification.tipo
          const iconConfig = tipo === 'inversion_aprobada'
            ? { bg: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle size={20} /> }
            : tipo === 'credito_no_colocado'
              ? { bg: 'bg-amber-500/10 text-amber-400', icon: <AlertTriangle size={20} /> }
              : { bg: 'bg-red-500/10 text-red-400', icon: <XCircle size={20} /> }

          return (
            <button
              key={notification.id}
              onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
              disabled={notification.leida && isPending}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                notification.leida
                  ? 'bg-zinc-900/50 border-zinc-800/50'
                  : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${iconConfig.bg}`}>
                  {iconConfig.icon
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${notification.leida ? 'text-zinc-400' : 'text-white'}`}>
                      {notification.titulo}
                    </h3>
                    {!notification.leida && (
                      <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 leading-relaxed whitespace-pre-line ${notification.leida ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {notification.mensaje}
                  </p>
                  <p className="text-xs text-zinc-600 mt-2">
                    {timeAgo(notification.created_at)}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
