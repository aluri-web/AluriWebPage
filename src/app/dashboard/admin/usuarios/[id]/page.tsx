import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, IdCard, Calendar, Shield } from 'lucide-react'
import { getUserDetails, listUserDocuments } from './actions'
import DocumentsPanel from './DocumentsPanel'

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserDetails(id)

  if (!user) notFound()

  const documents = await listUserDocuments(id)

  const roleStyles: Record<string, string> = {
    admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    inversionista: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    inversor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    propietario: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    demo: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  const verificationLabel: Record<string, string> = {
    verified: 'Verificado',
    rejected: 'Rechazado',
    pending: 'Pendiente',
  }
  const verificationStyles: Record<string, string> = {
    verified: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }
  const vstatus = user.verification_status || 'pending'

  const meta = (user.metadata || {}) as Record<string, string | undefined>
  const phone = user.phone || meta.telefono || null

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <Link
          href="/dashboard/admin/usuarios"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a Usuarios
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400 shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white truncate">
                {user.full_name || 'Sin nombre'}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${roleStyles[user.role] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                  {user.role}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${verificationStyles[vstatus]}`}>
                  {verificationLabel[vstatus]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: info personal */}
        <aside className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <User size={18} className="text-purple-400" />
              <h3 className="font-semibold text-white">Datos Personales</h3>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <InfoRow icon={<IdCard size={14} />} label="Cedula" value={user.document_id} mono />
              <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
              <InfoRow icon={<Phone size={14} />} label="Telefono" value={phone} />
              <InfoRow icon={<Calendar size={14} />} label="Registro" value={formatDate(user.created_at)} />
              <InfoRow icon={<Shield size={14} />} label="ID Sistema" value={`${user.id.substring(0, 8)}...`} mono />
            </div>
          </div>
        </aside>

        {/* Main: Documentos */}
        <section className="lg:col-span-2">
          <DocumentsPanel
            userId={user.id}
            role={user.role}
            documents={documents}
          />
        </section>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-500 shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-slate-200 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value || <span className="text-slate-600">-</span>}
      </span>
    </div>
  )
}
