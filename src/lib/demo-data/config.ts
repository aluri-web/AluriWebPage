export const DEMO_CONFIG = {
  tasa_nominal_min: 1.5,
  tasa_nominal_max: 2.5,
  tasa_ea_min: 19.56,
  tasa_ea_max: 34.49,
  ltv_maximo: 60,
  plazo_min: 3,
  plazo_max: 36,
  inversion_minima: 40000000,
  max_inversores_por_credito: 5,
  comision_aluri_pct: 1.5,
  comision_deudor_min: 3,
  comision_deudor_max: 8,
}

export const DEMO_ADMIN_PROFILE = {
  full_name: 'Carlos Rodriguez Martinez',
  email: 'carlos.rodriguez@aluri.co',
  phone: '+57 310 555 1234',
  avatar_url: null,
  role: 'admin',
}

export interface DemoTasa {
  id: string
  nombre: string
  tipo: string
  valor: number
  descripcion: string
  activa: boolean
  created_at: string
}

export const DEMO_TASAS: DemoTasa[] = [
  {
    id: 'tasa-001',
    nombre: 'Tasa Base Inversionista',
    tipo: 'porcentaje',
    valor: 1.5,
    descripcion: 'Tasa minima mensual para inversionistas',
    activa: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tasa-002',
    nombre: 'Comision Plataforma',
    tipo: 'porcentaje',
    valor: 3.0,
    descripcion: 'Comision cobrada al deudor por uso de la plataforma',
    activa: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tasa-003',
    nombre: 'Tasa Mora',
    tipo: 'porcentaje',
    valor: 1.5,
    descripcion: 'Tasa adicional mensual por mora en pagos',
    activa: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tasa-004',
    nombre: 'Comision Estructuracion',
    tipo: 'porcentaje',
    valor: 1.0,
    descripcion: 'Comision por estructuracion del credito',
    activa: false,
    created_at: '2024-03-15T00:00:00Z',
  },
]

export const DEMO_PROPIETARIO_PROFILE = {
  full_name: 'Juan Pablo Moreno Castaño',
  email: 'juanpablo.moreno@gmail.com',
  avatar_url: null,
  role: 'propietario',
}

export const DEMO_INVERSIONISTA_PROFILE = {
  full_name: 'Maria Fernanda Lopez Gutierrez',
  email: 'maria.lopez@gmail.com',
  avatar_url: null,
  role: 'inversionista',
}
