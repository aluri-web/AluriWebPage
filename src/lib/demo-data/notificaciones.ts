export interface DemoNotificacion {
  id: string
  user_id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export const DEMO_NOTIFICACIONES: DemoNotificacion[] = [
  // Admin notifications
  {
    id: 'demo-notif-001',
    user_id: 'demo-admin-001',
    tipo: 'nueva_solicitud_credito',
    titulo: 'Nueva solicitud de credito',
    mensaje: 'Juan Pablo Moreno ha solicitado un credito por $200,000,000 en Bogota',
    leida: false,
    metadata: { solicitud_id: 'demo-sol-001' },
    created_at: '2025-03-01T10:00:00Z',
  },
  {
    id: 'demo-notif-002',
    user_id: 'demo-admin-001',
    tipo: 'documentos_actualizados',
    titulo: 'Documentos actualizados',
    mensaje: 'Juan Pablo Moreno ha actualizado los documentos de su solicitud (5/5 docs, 5/5 fotos)',
    leida: false,
    metadata: { solicitud_id: 'demo-sol-001' },
    created_at: '2025-03-03T14:30:00Z',
  },
  {
    id: 'demo-notif-003',
    user_id: 'demo-admin-001',
    tipo: 'nueva_solicitud_credito',
    titulo: 'Nueva solicitud de credito',
    mensaje: 'Ana Maria Gutierrez ha solicitado un credito por $180,000,000 en Medellin',
    leida: true,
    metadata: { solicitud_id: 'demo-sol-002' },
    created_at: '2025-03-07T09:30:00Z',
  },
  {
    id: 'demo-notif-004',
    user_id: 'demo-admin-001',
    tipo: 'nueva_inversion',
    titulo: 'Nueva inversion recibida',
    mensaje: 'Carolina Ortiz ha invertido $90,000,000 en ALU-2025-003',
    leida: true,
    metadata: { credito_id: 'demo-cred-003' },
    created_at: '2025-02-25T11:00:00Z',
  },

  // Propietario notifications (demo-prop-001)
  {
    id: 'demo-notif-010',
    user_id: 'demo-prop-001',
    tipo: 'solicitud_en_revision',
    titulo: 'Solicitud en revision',
    mensaje: 'Tu solicitud de credito por $200,000,000 en Bogota esta siendo revisada por nuestro equipo.',
    leida: false,
    metadata: { solicitud_id: 'demo-sol-001', estado: 'en_revision' },
    created_at: '2025-03-05T14:00:00Z',
  },
  {
    id: 'demo-notif-011',
    user_id: 'demo-prop-001',
    tipo: 'pago_registrado',
    titulo: 'Pago registrado',
    mensaje: 'Se ha registrado un pago de $23,240,000 para el credito ALU-2025-001.',
    leida: true,
    metadata: { credito_id: 'demo-cred-001' },
    created_at: '2025-03-15T10:30:00Z',
  },
  {
    id: 'demo-notif-012',
    user_id: 'demo-prop-001',
    tipo: 'recordatorio_pago',
    titulo: 'Recordatorio de pago',
    mensaje: 'Tu proximo pago para ALU-2025-001 vence el 15 de abril.',
    leida: false,
    metadata: { credito_id: 'demo-cred-001' },
    created_at: '2025-03-08T08:00:00Z',
  },

  // Inversionista notifications (demo-inv-001)
  {
    id: 'demo-notif-020',
    user_id: 'demo-inv-001',
    tipo: 'inversion_confirmada',
    titulo: 'Inversion confirmada',
    mensaje: 'Tu inversion de $80,000,000 en ALU-2025-007 ha sido confirmada.',
    leida: false,
    metadata: { credito_id: 'demo-cred-007' },
    created_at: '2025-03-08T10:00:00Z',
  },
  {
    id: 'demo-notif-021',
    user_id: 'demo-inv-001',
    tipo: 'pago_recibido',
    titulo: 'Rendimiento recibido',
    mensaje: 'Has recibido $1,800,000 de intereses del credito ALU-2025-001.',
    leida: false,
    metadata: { credito_id: 'demo-cred-001' },
    created_at: '2025-03-15T11:00:00Z',
  },
  {
    id: 'demo-notif-022',
    user_id: 'demo-inv-001',
    tipo: 'nueva_oportunidad',
    titulo: 'Nueva oportunidad de inversion',
    mensaje: 'Nuevo credito publicado en Barranquilla por $200,000,000 con tasa del 25.34% EA.',
    leida: true,
    metadata: { credito_id: 'demo-cred-004' },
    created_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 'demo-notif-023',
    user_id: 'demo-inv-001',
    tipo: 'credito_en_mora',
    titulo: 'Credito en mora',
    mensaje: 'El credito ALU-2025-002 en el que invertiste se encuentra en mora.',
    leida: true,
    metadata: { credito_id: 'demo-cred-002' },
    created_at: '2025-02-20T09:00:00Z',
  },
]
