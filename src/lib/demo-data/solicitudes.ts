export interface DemoSolicitud {
  id: string
  solicitante_id: string
  direccion_inmueble: string
  ciudad: string
  tiene_hipoteca: boolean
  a_nombre_solicitante: boolean
  monto_requerido: number
  valor_inmueble: number
  uso_dinero: string | null
  documentos: { tipo: string; url: string }[]
  fotos: { tipo: string; url: string }[]
  estado: string
  notas_admin: string | null
  created_at: string
  updated_at: string
  solicitante: {
    full_name: string | null
    email: string | null
    document_id: string | null
  } | null
}

const PLACEHOLDER_PDF = 'https://images.unsplash.com/photo-1586953208270-767fc20440b7?w=100&h=100&fit=crop'
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop'

export const DEMO_SOLICITUDES: DemoSolicitud[] = [
  {
    id: 'demo-sol-001',
    solicitante_id: 'demo-prop-001',
    direccion_inmueble: 'Cra 15 #93-47, Chico',
    ciudad: 'Bogota',
    tiene_hipoteca: false,
    a_nombre_solicitante: true,
    monto_requerido: 200000000,
    valor_inmueble: 500000000,
    uso_dinero: 'Capital de trabajo para negocio de importaciones',
    documentos: [
      { tipo: 'libertad_tradicion', url: PLACEHOLDER_PDF },
      { tipo: 'escritura', url: PLACEHOLDER_PDF },
      { tipo: 'cedula', url: PLACEHOLDER_PDF },
      { tipo: 'extractos', url: PLACEHOLDER_PDF },
      { tipo: 'declaracion_renta', url: PLACEHOLDER_PDF },
    ],
    fotos: [
      { tipo: 'fachada', url: PLACEHOLDER_IMG },
      { tipo: 'sala', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop' },
      { tipo: 'cocina', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
      { tipo: 'habitaciones', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop' },
      { tipo: 'banos', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop' },
    ],
    estado: 'en_revision',
    notas_admin: 'Documentos completos. Verificando con notaria.',
    created_at: '2025-03-01T10:00:00Z',
    updated_at: '2025-03-05T14:00:00Z',
    solicitante: { full_name: 'Juan Pablo Moreno Castaño', email: 'juanpablo.moreno@gmail.com', document_id: '1040567890' },
  },
  {
    id: 'demo-sol-002',
    solicitante_id: 'demo-prop-002',
    direccion_inmueble: 'Cll 10 #43B-25, El Poblado',
    ciudad: 'Medellin',
    tiene_hipoteca: false,
    a_nombre_solicitante: true,
    monto_requerido: 180000000,
    valor_inmueble: 450000000,
    uso_dinero: 'Remodelacion de consultorio medico',
    documentos: [
      { tipo: 'libertad_tradicion', url: PLACEHOLDER_PDF },
      { tipo: 'escritura', url: PLACEHOLDER_PDF },
      { tipo: 'cedula', url: PLACEHOLDER_PDF },
    ],
    fotos: [
      { tipo: 'fachada', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop' },
      { tipo: 'sala', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop' },
    ],
    estado: 'pendiente',
    notas_admin: null,
    created_at: '2025-03-07T09:30:00Z',
    updated_at: '2025-03-07T09:30:00Z',
    solicitante: { full_name: 'Ana Maria Gutierrez Pardo', email: 'ana.gutierrez@outlook.com', document_id: '52678901' },
  },
  {
    id: 'demo-sol-003',
    solicitante_id: 'demo-prop-003',
    direccion_inmueble: 'Av 5N #23-45, Granada',
    ciudad: 'Cali',
    tiene_hipoteca: true,
    a_nombre_solicitante: true,
    monto_requerido: 100000000,
    valor_inmueble: 280000000,
    uso_dinero: 'Inversion en finca raiz',
    documentos: [
      { tipo: 'libertad_tradicion', url: PLACEHOLDER_PDF },
      { tipo: 'cedula', url: PLACEHOLDER_PDF },
    ],
    fotos: [],
    estado: 'pendiente',
    notas_admin: null,
    created_at: '2025-03-08T16:00:00Z',
    updated_at: '2025-03-08T16:00:00Z',
    solicitante: { full_name: 'Roberto Sanchez Villa', email: 'roberto.sanchez@gmail.com', document_id: '80789012' },
  },
  {
    id: 'demo-sol-004',
    solicitante_id: 'demo-prop-005',
    direccion_inmueble: 'Cra 13 #15-20, Centro',
    ciudad: 'Pereira',
    tiene_hipoteca: false,
    a_nombre_solicitante: false,
    monto_requerido: 80000000,
    valor_inmueble: 200000000,
    uso_dinero: 'Consolidacion de deudas',
    documentos: [
      { tipo: 'libertad_tradicion', url: PLACEHOLDER_PDF },
      { tipo: 'escritura', url: PLACEHOLDER_PDF },
      { tipo: 'cedula', url: PLACEHOLDER_PDF },
      { tipo: 'extractos', url: PLACEHOLDER_PDF },
      { tipo: 'declaracion_renta', url: PLACEHOLDER_PDF },
    ],
    fotos: [
      { tipo: 'fachada', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop' },
      { tipo: 'sala', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop' },
      { tipo: 'cocina', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
      { tipo: 'habitaciones', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop' },
      { tipo: 'banos', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop' },
    ],
    estado: 'aprobada',
    notas_admin: 'Aprobada. Inmueble en buenas condiciones, LTV dentro de parametros.',
    created_at: '2025-02-15T10:00:00Z',
    updated_at: '2025-02-25T16:30:00Z',
    solicitante: { full_name: 'Fernando Reyes Agudelo', email: 'fernando.reyes@hotmail.com', document_id: '71901234' },
  },
  {
    id: 'demo-sol-005',
    solicitante_id: 'demo-prop-004',
    direccion_inmueble: 'Cra 27 #36-24, Cabecera',
    ciudad: 'Bucaramanga',
    tiene_hipoteca: false,
    a_nombre_solicitante: true,
    monto_requerido: 250000000,
    valor_inmueble: 420000000,
    uso_dinero: 'Expansion de negocio',
    documentos: [
      { tipo: 'libertad_tradicion', url: PLACEHOLDER_PDF },
      { tipo: 'escritura', url: PLACEHOLDER_PDF },
      { tipo: 'cedula', url: PLACEHOLDER_PDF },
      { tipo: 'extractos', url: PLACEHOLDER_PDF },
      { tipo: 'declaracion_renta', url: PLACEHOLDER_PDF },
    ],
    fotos: [
      { tipo: 'fachada', url: PLACEHOLDER_IMG },
      { tipo: 'sala', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop' },
      { tipo: 'cocina', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
      { tipo: 'habitaciones', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop' },
      { tipo: 'banos', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop' },
    ],
    estado: 'rechazada',
    notas_admin: 'LTV excede el limite permitido del 60%. El monto requerido es demasiado alto para el valor del inmueble.',
    created_at: '2025-02-01T11:00:00Z',
    updated_at: '2025-02-10T09:00:00Z',
    solicitante: { full_name: 'Patricia Duarte Romero', email: 'patricia.duarte@yahoo.com', document_id: '43890123' },
  },
]
