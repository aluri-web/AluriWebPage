export type UserRole = 'inversionista' | 'inversor' | 'propietario' | 'admin' | 'demo'

export interface DocumentTypeDef {
  key: string
  label: string
  description?: string
}

const PROPIETARIO_DOCS: DocumentTypeDef[] = [
  { key: 'cedula', label: 'Cedula', description: 'Cedula de ciudadania (frente y reverso)' },
  { key: 'escritura', label: 'Escritura', description: 'Escritura del inmueble' },
  { key: 'libertad_y_tradicion', label: 'Libertad y Tradicion', description: 'Certificado vigente (no mayor a 30 dias)' },
  { key: 'extractos', label: 'Extractos Bancarios', description: 'Ultimos 3 meses' },
  { key: 'declaracion_renta', label: 'Declaracion de Renta', description: 'Ultima declaracion presentada' },
  { key: 'impuesto_predial', label: 'Impuesto Predial', description: 'Ultimo recibo pagado' },
]

const INVERSIONISTA_DOCS: DocumentTypeDef[] = [
  { key: 'cedula', label: 'Cedula', description: 'Cedula de ciudadania (frente y reverso)' },
  { key: 'rut', label: 'RUT', description: 'Registro Unico Tributario' },
  { key: 'certificacion_bancaria', label: 'Certificacion Bancaria', description: 'No mayor a 30 dias' },
]

const ADMIN_DOCS: DocumentTypeDef[] = []
const DEMO_DOCS: DocumentTypeDef[] = []

export function getDocumentTypesForRole(role: string): DocumentTypeDef[] {
  switch (role) {
    case 'propietario':
      return PROPIETARIO_DOCS
    case 'inversionista':
    case 'inversor':
      return INVERSIONISTA_DOCS
    case 'admin':
      return ADMIN_DOCS
    case 'demo':
      return DEMO_DOCS
    default:
      return []
  }
}

export function getDocumentTypeLabel(role: string, tipo: string): string {
  const def = getDocumentTypesForRole(role).find(d => d.key === tipo)
  return def?.label || tipo
}
