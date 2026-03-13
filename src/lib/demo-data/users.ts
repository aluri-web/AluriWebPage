export interface DemoUserProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  verification_status: string | null
  created_at: string
  document_id?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  metadata?: {
    telefono?: string
    ciudad?: string
    monto_inversion?: string
    [key: string]: string | undefined
  } | null
}

export const DEMO_USERS: DemoUserProfile[] = [
  // Admins
  {
    id: 'demo-admin-001',
    full_name: 'Carlos Rodriguez Martinez',
    email: 'carlos.rodriguez@aluri.co',
    role: 'admin',
    verification_status: 'verified',
    created_at: '2024-03-15T10:30:00Z',
    document_id: '1020345678',
    phone: '+57 310 555 1234',
    city: 'Bogota',
    metadata: { telefono: '+57 310 555 1234', ciudad: 'Bogota' },
  },
  {
    id: 'demo-admin-002',
    full_name: 'Laura Mejia Rios',
    email: 'laura.mejia@aluri.co',
    role: 'admin',
    verification_status: 'verified',
    created_at: '2024-04-01T08:00:00Z',
    document_id: '1030456789',
    phone: '+57 311 555 2345',
    city: 'Bogota',
    metadata: { telefono: '+57 311 555 2345', ciudad: 'Bogota' },
  },
  // Inversionistas
  {
    id: 'demo-inv-001',
    full_name: 'Maria Fernanda Lopez Gutierrez',
    email: 'maria.lopez@aluri.com',
    role: 'inversionista',
    verification_status: 'verified',
    created_at: '2024-06-20T14:00:00Z',
    document_id: '52345678',
    phone: '+57 315 555 5678',
    city: 'Medellin',
    metadata: { telefono: '+57 315 555 5678', ciudad: 'Medellin', monto_inversion: '$150,000,000 COP' },
  },
  {
    id: 'demo-inv-002',
    full_name: 'Andres Felipe Herrera',
    email: 'andres.herrera@aluri.com',
    role: 'inversionista',
    verification_status: 'verified',
    created_at: '2024-07-10T09:30:00Z',
    document_id: '80567890',
    phone: '+57 320 555 6789',
    city: 'Bogota',
    metadata: { telefono: '+57 320 555 6789', ciudad: 'Bogota', monto_inversion: '$200,000,000 COP' },
  },
  {
    id: 'demo-inv-003',
    full_name: 'Sofia Ramirez Vasquez',
    email: 'sofia.ramirez@aluri.com',
    role: 'inversionista',
    verification_status: 'verified',
    created_at: '2024-08-05T16:45:00Z',
    document_id: '43678901',
    phone: '+57 312 555 7890',
    city: 'Cali',
    metadata: { telefono: '+57 312 555 7890', ciudad: 'Cali', monto_inversion: '$100,000,000 COP' },
  },
  {
    id: 'demo-inv-004',
    full_name: 'Diego Alejandro Torres',
    email: 'diego.torres@aluri.com',
    role: 'inversionista',
    verification_status: 'verified',
    created_at: '2024-09-12T11:00:00Z',
    document_id: '71890123',
    phone: '+57 318 555 8901',
    city: 'Barranquilla',
    metadata: { telefono: '+57 318 555 8901', ciudad: 'Barranquilla', monto_inversion: '$80,000,000 COP' },
  },
  {
    id: 'demo-inv-005',
    full_name: 'Carolina Ortiz Mendoza',
    email: 'carolina.ortiz@aluri.com',
    role: 'inversionista',
    verification_status: 'verified',
    created_at: '2024-10-01T13:20:00Z',
    document_id: '39012345',
    phone: '+57 316 555 9012',
    city: 'Cartagena',
    metadata: { telefono: '+57 316 555 9012', ciudad: 'Cartagena', monto_inversion: '$120,000,000 COP' },
  },
  // Propietarios
  {
    id: 'demo-prop-001',
    full_name: 'Juan Pablo Moreno Castaño',
    email: 'juanpablo.moreno@aluri.com',
    role: 'propietario',
    verification_status: 'verified',
    created_at: '2024-04-18T10:00:00Z',
    document_id: '1040567890',
    phone: '+57 300 555 3456',
    city: 'Bogota',
    metadata: { telefono: '+57 300 555 3456', ciudad: 'Bogota' },
  },
  {
    id: 'demo-prop-002',
    full_name: 'Ana Maria Gutierrez Pardo',
    email: 'ana.gutierrez@aluri.com',
    role: 'propietario',
    verification_status: 'verified',
    created_at: '2024-05-22T15:30:00Z',
    document_id: '52678901',
    phone: '+57 301 555 4567',
    city: 'Medellin',
    metadata: { telefono: '+57 301 555 4567', ciudad: 'Medellin' },
  },
  {
    id: 'demo-prop-003',
    full_name: 'Roberto Sanchez Villa',
    email: 'roberto.sanchez@aluri.com',
    role: 'propietario',
    verification_status: 'verified',
    created_at: '2024-06-30T12:15:00Z',
    document_id: '80789012',
    phone: '+57 314 555 5678',
    city: 'Cali',
    metadata: { telefono: '+57 314 555 5678', ciudad: 'Cali' },
  },
  {
    id: 'demo-prop-004',
    full_name: 'Patricia Duarte Romero',
    email: 'patricia.duarte@aluri.com',
    role: 'propietario',
    verification_status: 'verified',
    created_at: '2024-08-14T09:45:00Z',
    document_id: '43890123',
    phone: '+57 317 555 6789',
    city: 'Bucaramanga',
    metadata: { telefono: '+57 317 555 6789', ciudad: 'Bucaramanga' },
  },
  {
    id: 'demo-prop-005',
    full_name: 'Fernando Reyes Agudelo',
    email: 'fernando.reyes@aluri.com',
    role: 'propietario',
    verification_status: 'verified',
    created_at: '2024-09-25T14:00:00Z',
    document_id: '71901234',
    phone: '+57 319 555 7890',
    city: 'Pereira',
    metadata: { telefono: '+57 319 555 7890', ciudad: 'Pereira' },
  },
  {
    id: 'demo-prop-006',
    full_name: 'Claudia Vargas Pineda',
    email: 'claudia.vargas@aluri.com',
    role: 'propietario',
    verification_status: 'unverified',
    created_at: '2025-01-05T10:30:00Z',
    document_id: '39123456',
    phone: '+57 322 555 8901',
    city: 'Manizales',
    metadata: { telefono: '+57 322 555 8901', ciudad: 'Manizales' },
  },
  // Inversionistas pendientes
  {
    id: 'demo-inv-006',
    full_name: 'Miguel Angel Castillo',
    email: 'miguel.castillo@aluri.com',
    role: 'inversionista',
    verification_status: 'unverified',
    created_at: '2025-02-10T08:15:00Z',
    document_id: '1050678901',
    phone: '+57 313 555 0123',
    city: 'Ibague',
    metadata: { telefono: '+57 313 555 0123', ciudad: 'Ibague', monto_inversion: '$60,000,000 COP' },
  },
]
