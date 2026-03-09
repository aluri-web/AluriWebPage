'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Bell, CheckCheck } from 'lucide-react'
import { DEMO_NOTIFICACIONES, type DemoNotificacion } from '@/lib/demo-data/index'

const PROPIETARIO_ID = 'demo-prop-001'

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
    case 'pago_registrado':
    case 'solicitud_en_revision':
      return <CheckCircle size={20} />
    case 'inversion_rechazada':
      return <XCircle size={20} />
    case 'credito_eliminado':
    case 'credito_no_colocado':
    case 'recordatorio_pago':
      return <AlertTriangle size={20} />
    default:
      return <Bell size={20} />
  }
}

function getNotificationColor(tipo: string) {
  switch (tipo) {
    case 'inversion_aprobada':
    case 'pago_registrado':
      return 'bg-emerald-50 text-emerald-600'
    case 'solicitud_en_revision':
      return 'bg-blue-50 text-blue-600'
    case 'inversion_rechazada':
      return 'bg-red-50 text-red-600'
    case 'credito_eliminado':
    case 'credito_no_colocado':
    case 'recordatorio_pago':
      return 'bg-amber-50 text-amber-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

export default function DemoNotificacionesPage() {
  const initialNotifications = DEMO_NOTIFICACIONES.filter(n => n.user_id === PROPIETARIO_ID)
  const [notifications, setNotifications] = useState<DemoNotificacion[]>(initialNotifications)

  const unreadCount = notifications.filter(n => !n.leida).length
  const hasUnread = unreadCount > 0

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, leida: true }))
    )
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-gray-500 mt-1">
          {unreadCount > 0
            ? `Tienes ${unreadCount} notificacion${unreadCount !== 1 ? 'es' : ''} sin leer`
            : 'Estas al dia'
          }
        </p>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <Bell size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Sin notificaciones</p>
          <p className="text-gray-400 text-sm mt-1">Las notificaciones apareceran aqui</p>
        </div>
      ) : (
        <div>
          {hasUnread && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
              >
                <CheckCheck size={16} />
                Marcar todo como leido
              </button>
            </div>
          )}

          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
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
      )}
    </div>
  )
}
