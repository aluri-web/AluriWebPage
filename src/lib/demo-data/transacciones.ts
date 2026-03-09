export interface DemoTransaccion {
  id: string
  credito_id: string
  credito_codigo: string
  tipo_transaccion: string
  monto: number
  fecha_transaccion: string
  fecha_aplicacion: string
  referencia_pago: string | null
  propietario_name: string
  created_at: string
}

export const DEMO_TRANSACCIONES: DemoTransaccion[] = [
  // ALU-2025-001 - 3 months of payments
  { id: 'demo-tx-001', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2025-02-15', fecha_aplicacion: '2025-02-15', referencia_pago: 'REF-2025-001-01', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-02-15T10:00:00Z' },
  { id: 'demo-tx-002', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_interes', monto: 3240000, fecha_transaccion: '2025-02-15', fecha_aplicacion: '2025-02-15', referencia_pago: 'REF-2025-001-01', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-02-15T10:00:00Z' },
  { id: 'demo-tx-003', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2025-03-15', fecha_aplicacion: '2025-03-15', referencia_pago: 'REF-2025-001-02', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-03-15T10:00:00Z' },
  { id: 'demo-tx-004', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_interes', monto: 2880000, fecha_transaccion: '2025-03-15', fecha_aplicacion: '2025-03-15', referencia_pago: 'REF-2025-001-02', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-03-15T10:00:00Z' },
  { id: 'demo-tx-005', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2025-01-20', fecha_aplicacion: '2025-01-20', referencia_pago: 'REF-2025-001-00', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-01-20T10:00:00Z' },
  { id: 'demo-tx-006', credito_id: 'demo-cred-001', credito_codigo: 'ALU-2025-001', tipo_transaccion: 'pago_interes', monto: 3240000, fecha_transaccion: '2025-01-20', fecha_aplicacion: '2025-01-20', referencia_pago: 'REF-2025-001-00', propietario_name: 'Juan Pablo Moreno Castaño', created_at: '2025-01-20T10:00:00Z' },

  // ALU-2025-002 - 2 months, then missed (mora)
  { id: 'demo-tx-007', credito_id: 'demo-cred-002', credito_codigo: 'ALU-2025-002', tipo_transaccion: 'pago_capital', monto: 25000000, fecha_transaccion: '2024-12-15', fecha_aplicacion: '2024-12-15', referencia_pago: 'REF-2025-002-01', propietario_name: 'Ana Maria Gutierrez Pardo', created_at: '2024-12-15T10:00:00Z' },
  { id: 'demo-tx-008', credito_id: 'demo-cred-002', credito_codigo: 'ALU-2025-002', tipo_transaccion: 'pago_interes', monto: 5000000, fecha_transaccion: '2024-12-15', fecha_aplicacion: '2024-12-15', referencia_pago: 'REF-2025-002-01', propietario_name: 'Ana Maria Gutierrez Pardo', created_at: '2024-12-15T10:00:00Z' },
  { id: 'demo-tx-009', credito_id: 'demo-cred-002', credito_codigo: 'ALU-2025-002', tipo_transaccion: 'pago_capital', monto: 25000000, fecha_transaccion: '2025-01-15', fecha_aplicacion: '2025-01-15', referencia_pago: 'REF-2025-002-02', propietario_name: 'Ana Maria Gutierrez Pardo', created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-tx-010', credito_id: 'demo-cred-002', credito_codigo: 'ALU-2025-002', tipo_transaccion: 'pago_interes', monto: 4500000, fecha_transaccion: '2025-01-15', fecha_aplicacion: '2025-01-15', referencia_pago: 'REF-2025-002-02', propietario_name: 'Ana Maria Gutierrez Pardo', created_at: '2025-01-15T10:00:00Z' },

  // ALU-2024-005 (finalizado) - all 6 months paid
  { id: 'demo-tx-011', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-07-15', fecha_aplicacion: '2024-07-15', referencia_pago: 'REF-2024-005-01', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-07-15T10:00:00Z' },
  { id: 'demo-tx-012', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 1920000, fecha_transaccion: '2024-07-15', fecha_aplicacion: '2024-07-15', referencia_pago: 'REF-2024-005-01', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-07-15T10:00:00Z' },
  { id: 'demo-tx-013', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-08-15', fecha_aplicacion: '2024-08-15', referencia_pago: 'REF-2024-005-02', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-08-15T10:00:00Z' },
  { id: 'demo-tx-014', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 1600000, fecha_transaccion: '2024-08-15', fecha_aplicacion: '2024-08-15', referencia_pago: 'REF-2024-005-02', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-08-15T10:00:00Z' },
  { id: 'demo-tx-015', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-09-15', fecha_aplicacion: '2024-09-15', referencia_pago: 'REF-2024-005-03', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-09-15T10:00:00Z' },
  { id: 'demo-tx-016', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 1280000, fecha_transaccion: '2024-09-15', fecha_aplicacion: '2024-09-15', referencia_pago: 'REF-2024-005-03', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-09-15T10:00:00Z' },
  { id: 'demo-tx-017', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-10-15', fecha_aplicacion: '2024-10-15', referencia_pago: 'REF-2024-005-04', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-10-15T10:00:00Z' },
  { id: 'demo-tx-018', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 960000, fecha_transaccion: '2024-10-15', fecha_aplicacion: '2024-10-15', referencia_pago: 'REF-2024-005-04', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-10-15T10:00:00Z' },
  { id: 'demo-tx-019', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-11-15', fecha_aplicacion: '2024-11-15', referencia_pago: 'REF-2024-005-05', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-11-15T10:00:00Z' },
  { id: 'demo-tx-020', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 640000, fecha_transaccion: '2024-11-15', fecha_aplicacion: '2024-11-15', referencia_pago: 'REF-2024-005-05', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-11-15T10:00:00Z' },
  { id: 'demo-tx-021', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_capital', monto: 20000000, fecha_transaccion: '2024-12-15', fecha_aplicacion: '2024-12-15', referencia_pago: 'REF-2024-005-06', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-12-15T10:00:00Z' },
  { id: 'demo-tx-022', credito_id: 'demo-cred-005', credito_codigo: 'ALU-2024-005', tipo_transaccion: 'pago_interes', monto: 320000, fecha_transaccion: '2024-12-15', fecha_aplicacion: '2024-12-15', referencia_pago: 'REF-2024-005-06', propietario_name: 'Fernando Reyes Agudelo', created_at: '2024-12-15T10:00:00Z' },

  // ALU-2025-008 (activo) - 2 months paid
  { id: 'demo-tx-023', credito_id: 'demo-cred-008', credito_codigo: 'ALU-2025-008', tipo_transaccion: 'pago_capital', monto: 15000000, fecha_transaccion: '2025-01-15', fecha_aplicacion: '2025-01-15', referencia_pago: 'REF-2025-008-01', propietario_name: 'Claudia Vargas Pineda', created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-tx-024', credito_id: 'demo-cred-008', credito_codigo: 'ALU-2025-008', tipo_transaccion: 'pago_interes', monto: 1350000, fecha_transaccion: '2025-01-15', fecha_aplicacion: '2025-01-15', referencia_pago: 'REF-2025-008-01', propietario_name: 'Claudia Vargas Pineda', created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-tx-025', credito_id: 'demo-cred-008', credito_codigo: 'ALU-2025-008', tipo_transaccion: 'pago_capital', monto: 15000000, fecha_transaccion: '2025-02-15', fecha_aplicacion: '2025-02-15', referencia_pago: 'REF-2025-008-02', propietario_name: 'Claudia Vargas Pineda', created_at: '2025-02-15T10:00:00Z' },
  { id: 'demo-tx-026', credito_id: 'demo-cred-008', credito_codigo: 'ALU-2025-008', tipo_transaccion: 'pago_interes', monto: 1125000, fecha_transaccion: '2025-02-15', fecha_aplicacion: '2025-02-15', referencia_pago: 'REF-2025-008-02', propietario_name: 'Claudia Vargas Pineda', created_at: '2025-02-15T10:00:00Z' },
]
