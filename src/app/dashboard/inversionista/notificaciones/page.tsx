import { getNotifications, getUnreadCount } from './actions'
import NotificationsList from './NotificationsList'

export default async function NotificacionesPage() {
  const [{ data: notifications }, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadCount()
  ])

  return (
    <div className="text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
        <p className="text-zinc-500 mt-1">
          {unreadCount > 0
            ? `Tienes ${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`
            : 'Estás al día'
          }
        </p>
      </header>

      <NotificationsList notifications={notifications} />
    </div>
  )
}
