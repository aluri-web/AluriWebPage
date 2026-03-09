'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Bell, CheckCheck, TrendingUp, DollarSign } from 'lucide-react'
import {
  DEMO_NOTIFICACIONES,
  type DemoNotificacion,
} from '@/lib/demo-data'

const INVESTOR_ID = 'demo-inv-001'

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

function getIconConfig(tipo: string) {
  switch (tipo) {
    case 'inversion_confirmada':
      return { bg: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle size={20} /> }
    case 'pago_recibido':
      return { bg: 'bg-amber-500/10 text-amber-400', icon: <DollarSign size={20} /> }
    case 'nueva_oportunidad':
      return { bg: 'bg-cyan-500/10 text-cyan-400', icon: <TrendingUp size={20} /> }
    case 'credito_en_mora':
      return { bg: 'bg-red-500/10 text-red-400', icon: <AlertTriangle size={20} /> }
    default:
      return { bg: 'bg-zinc-500/10 text-zinc-400', icon: <Bell size={20} /> }
  }
}

export default function DemoNotificacionesPage() {
  const allNotifications = DEMO_NOTIFICACIONES.filter(
    (n) => n.user_id === INVESTOR_ID
  )

  const [notifications, setNotifications] = useState<DemoNotificacion[]>(allNotifications)

  const unreadCount = notifications.filter((n) => !n.leida).length
  const hasUnread = unreadCount > 0

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, leida: true } : n
      )
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  return (
    <div className="text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
        <p className="text-zinc-500 mt-1">
          {unreadCount > 0
            ? `Tienes ${unreadCount} notificacion${unreadCount !== 1 ? 'es' : ''} sin leer`
            : 'Estas al dia'}
        </p>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-zinc-900 rounded-xl border border-zinc-800">
          <Bell size={48} className="text-zinc-700 mb-4" />
          <p className="text-zinc-400 text-lg font-medium">Sin notificaciones</p>
          <p className="text-zinc-600 text-sm mt-1">
            Las notificaciones apareceran aqui
          </p>
        </div>
      ) : (
        <div>
          {hasUnread && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
              >
                <CheckCheck size={16} />
                Marcar todo como leido
              </button>
            </div>
          )}

          <div className="space-y-2">
            {notifications.map((notification) => {
              const iconConfig = getIconConfig(notification.tipo)

              return (
                <button
                  key={notification.id}
                  onClick={() =>
                    !notification.leida && handleMarkAsRead(notification.id)
                  }
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    notification.leida
                      ? 'bg-zinc-900/50 border-zinc-800/50'
                      : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${iconConfig.bg}`}
                    >
                      {iconConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            notification.leida
                              ? 'text-zinc-400'
                              : 'text-white'
                          }`}
                        >
                          {notification.titulo}
                        </h3>
                        {!notification.leida && (
                          <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 leading-relaxed whitespace-pre-line ${
                          notification.leida
                            ? 'text-zinc-600'
                            : 'text-zinc-400'
                        }`}
                      >
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
      )}
    </div>
  )
}
