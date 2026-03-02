import {
  obtenerCreditos,
  buscarCredito,
  obtenerCreditosEnMora,
  obtenerResumen,
  obtenerInversionistas,
  obtenerResumenInversionistas,
  obtenerPropietarios,
  obtenerResumenPropietarios,
  obtenerPagosCredito,
  obtenerTasas,
  formatearMoneda,
  formatearFecha,
} from './api.js'
import { chatConLLM, limpiarHistorial } from './llm.js'

// Verificar si el LLM está habilitado
const LLM_ENABLED = !!process.env.ANTHROPIC_API_KEY

// Procesar mensaje y retornar respuesta
export async function procesarMensaje(texto: string, userId?: string): Promise<string | null> {
  const mensaje = texto.toLowerCase().trim()

  try {
    // Comando: ayuda
    if (mensaje === '/ayuda' || mensaje === '/help' || mensaje === 'ayuda') {
      return obtenerAyuda()
    }

    // Comando: resumen
    if (mensaje === '/resumen' || mensaje === 'resumen' || mensaje === 'dashboard') {
      return await comandoResumen()
    }

    // Comando: créditos
    if (mensaje === '/creditos' || mensaje === 'creditos' || mensaje === 'créditos') {
      return await comandoCreditos()
    }

    // Comando: mora
    if (mensaje === '/mora' || mensaje === 'mora') {
      return await comandoMora()
    }

    // Comando: tasas oficiales
    if (mensaje === '/tasas' || mensaje === 'tasas' || mensaje === 'tasa mora' || mensaje === 'tasa de mora') {
      return await comandoTasas()
    }

    // Comando: inversionistas
    if (mensaje === '/inversionistas' || mensaje === 'inversionistas') {
      return await comandoInversionistas()
    }

    // Comando: buscar inversionista
    if (mensaje.startsWith('/inv ') || mensaje.startsWith('inv ')) {
      const buscar = mensaje.replace(/^\/?inv\s+/i, '').trim()
      return await comandoBuscarInversionista(buscar)
    }

    // Comando: propietarios
    if (mensaje === '/propietarios' || mensaje === 'propietarios') {
      return await comandoPropietarios()
    }

    // Comando: buscar propietario
    if (mensaje.startsWith('/prop ') || mensaje.startsWith('prop ')) {
      const buscar = mensaje.replace(/^\/?prop\s+/i, '').trim()
      return await comandoBuscarPropietario(buscar)
    }

    // Comando: pagos de un crédito
    if (mensaje.startsWith('/pagos ') || mensaje.startsWith('pagos ')) {
      const codigo = mensaje.replace(/^\/?pagos\s+/i, '').trim()
      return await comandoPagosCredito(codigo)
    }

    // Comando: buscar crédito específico (CR-001, CR001, etc)
    const matchCredito = mensaje.match(/cr[-\s]?(\d+)/i)
    if (matchCredito) {
      return await comandoBuscarCredito(`CR-${matchCredito[1].padStart(3, '0')}`)
    }

    // Comando: estado <codigo>
    if (mensaje.startsWith('/estado ') || mensaje.startsWith('estado ')) {
      const codigo = mensaje.replace(/^\/?estado\s+/i, '').trim()
      return await comandoBuscarCredito(codigo)
    }

    // Comando: limpiar historial de chat
    if (mensaje === '/nuevo' || mensaje === '/reset') {
      if (userId) {
        limpiarHistorial(userId)
      }
      return 'Conversacion reiniciada. Como puedo ayudarte?'
    }

    // Si el LLM está habilitado, enviar mensajes no reconocidos al asistente
    if (LLM_ENABLED && userId) {
      console.log('🤖 Enviando al LLM...')
      return await chatConLLM(userId, texto)
    }

    // Si no hay LLM, mostrar ayuda para comandos no reconocidos
    if (mensaje === 'hola' || mensaje === 'hi' || mensaje === 'buenos dias' || mensaje === 'buenas') {
      return 'Hola! Soy el bot de Aluri. Escribe /ayuda para ver los comandos disponibles.'
    }

    // No es un comando reconocido y no hay LLM
    return null

  } catch (error) {
    console.error('Error procesando mensaje:', error)
    return `Error al procesar la solicitud. Por favor intenta de nuevo.`
  }
}

function obtenerAyuda(): string {
  const baseHelp = `*Bot Aluri - Comandos Disponibles*

📊 *Dashboard*
/resumen - Dashboard general

💰 *Creditos*
/creditos - Lista de creditos
/mora - Creditos en mora
/tasas - Tasas de interes vigentes
CR-001 - Buscar credito
/pagos CR-001 - Pagos de un credito

👥 *Inversionistas*
/inversionistas - Lista y resumen
/inv nombre - Buscar inversionista

🏠 *Propietarios*
/propietarios - Lista y resumen
/prop nombre - Buscar propietario`

  if (LLM_ENABLED) {
    return baseHelp + `

🤖 *Asistente IA*
/nuevo - Reiniciar conversacion
_Escribe cualquier pregunta y te ayudare!_`
  }

  return baseHelp
}

// =====================
// COMANDOS DE CREDITOS
// =====================

async function comandoResumen(): Promise<string> {
  const resumen = await obtenerResumen()
  const invResumen = await obtenerResumenInversionistas()
  const propResumen = await obtenerResumenPropietarios()

  return `*📊 Dashboard Aluri*

*Creditos*
Total: ${resumen.total}
🟢 Activos: ${resumen.activos}
🔴 En mora: ${resumen.enMora}
⚪ En fondeo: ${resumen.publicados}
💰 Monto colocado: ${formatearMoneda(resumen.montoActivo)}

*Inversionistas*
Total: ${invResumen.total}
Activos: ${invResumen.conInversionesActivas}
Invertido: ${formatearMoneda(invResumen.totalInvertido)}

*Propietarios*
Total: ${propResumen.total}
Con credito activo: ${propResumen.conCreditosActivos}
Deuda total: ${formatearMoneda(propResumen.totalDeuda)}`
}

async function comandoCreditos(): Promise<string> {
  const creditos = await obtenerCreditos()

  if (creditos.length === 0) {
    return 'No hay creditos registrados.'
  }

  const lista = creditos.map(c => {
    const estado = c.estado === 'activo' ? '🟢' : c.estado === 'mora' ? '🔴' : '⚪'
    return `${estado} *${c.codigo}* ${formatearMoneda(c.monto_solicitado)} - ${c.nombre_propietario}`
  }).join('\n')

  return `*Creditos (${creditos.length} total)*\n\n${lista}`
}

async function comandoMora(): Promise<string> {
  const creditos = await obtenerCreditosEnMora()

  if (creditos.length === 0) {
    return '✅ No hay creditos en mora actualmente.'
  }

  const lista = creditos.map(c => {
    return `🔴 *${c.codigo}*\n   ${c.nombre_propietario}\n   Monto: ${formatearMoneda(c.monto_solicitado)}`
  }).join('\n\n')

  return `*Creditos en Mora (${creditos.length})*\n\n${lista}`
}

async function comandoBuscarCredito(codigo: string): Promise<string> {
  const credito = await buscarCredito(codigo)

  if (!credito) {
    return `No se encontro el credito *${codigo.toUpperCase()}*`
  }

  const estadoEmoji = credito.estado === 'activo' ? '🟢' : credito.estado === 'mora' ? '🔴' : '⚪'

  return `*Credito ${credito.codigo}*

${estadoEmoji} Estado: ${credito.estado.toUpperCase()}
💰 Monto solicitado: ${formatearMoneda(credito.monto_solicitado)}
📊 Monto financiado: ${formatearMoneda(credito.monto_financiado)}
👤 Propietario: ${credito.nombre_propietario}

_Usa /pagos ${credito.codigo} para ver el historial de pagos_`
}

async function comandoPagosCredito(codigo: string): Promise<string> {
  const credito = await buscarCredito(codigo)

  if (!credito) {
    return `No se encontro el credito *${codigo.toUpperCase()}*`
  }

  const pagos = await obtenerPagosCredito(credito.id)

  if (pagos.length === 0) {
    return `*Pagos de ${credito.codigo}*\n\nNo hay pagos registrados para este credito.`
  }

  const lista = pagos.map(p => {
    return `📅 ${formatearFecha(p.fecha_pago)}
   Total: ${formatearMoneda(p.monto_total)}
   Capital: ${formatearMoneda(p.monto_capital)}
   Interes: ${formatearMoneda(p.monto_interes)}${p.monto_mora > 0 ? `\n   Mora: ${formatearMoneda(p.monto_mora)}` : ''}`
  }).join('\n\n')

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto_total, 0)

  return `*Pagos de ${credito.codigo}*

Total pagado: ${formatearMoneda(totalPagado)}
Pagos realizados: ${pagos.length}

${lista}`
}

// =====================
// COMANDOS DE INVERSIONISTAS
// =====================

async function comandoInversionistas(): Promise<string> {
  const inversionistas = await obtenerInversionistas()
  const resumen = await obtenerResumenInversionistas()

  if (inversionistas.length === 0) {
    return 'No hay inversionistas registrados.'
  }

  // Mostrar top 10 por monto invertido
  const top10 = [...inversionistas]
    .sort((a, b) => b.total_invertido - a.total_invertido)
    .slice(0, 10)

  const lista = top10.map((inv, idx) => {
    const activo = inv.inversiones_activas > 0 ? '🟢' : '⚪'
    return `${idx + 1}. ${activo} *${inv.full_name}*\n   ${formatearMoneda(inv.total_invertido)} (${inv.inversiones_activas} activas)`
  }).join('\n\n')

  return `*👥 Inversionistas*

Total: ${resumen.total}
Con inversiones activas: ${resumen.conInversionesActivas}
Total invertido: ${formatearMoneda(resumen.totalInvertido)}

*Top 10 por monto:*

${lista}

_Usa /inv nombre para buscar_`
}

async function comandoBuscarInversionista(buscar: string): Promise<string> {
  const inversionistas = await obtenerInversionistas(buscar)

  if (inversionistas.length === 0) {
    return `No se encontraron inversionistas con "${buscar}"`
  }

  const lista = inversionistas.slice(0, 5).map(inv => {
    const activo = inv.inversiones_activas > 0 ? '🟢' : '⚪'
    return `${activo} *${inv.full_name}*
📧 ${inv.email || 'Sin email'}
📱 ${inv.phone || 'Sin telefono'}
💰 Invertido: ${formatearMoneda(inv.total_invertido)}
📊 Inversiones: ${inv.inversiones_activas} activas / ${inv.inversiones_count} total`
  }).join('\n\n')

  return `*Inversionistas (${inversionistas.length} encontrados)*\n\n${lista}`
}

// =====================
// COMANDOS DE PROPIETARIOS
// =====================

async function comandoPropietarios(): Promise<string> {
  const propietarios = await obtenerPropietarios()
  const resumen = await obtenerResumenPropietarios()

  if (propietarios.length === 0) {
    return 'No hay propietarios registrados.'
  }

  // Mostrar top 10 por deuda
  const top10 = [...propietarios]
    .filter(p => p.creditos_activos > 0)
    .sort((a, b) => b.total_deuda - a.total_deuda)
    .slice(0, 10)

  const lista = top10.map((prop, idx) => {
    return `${idx + 1}. *${prop.full_name}*\n   ${formatearMoneda(prop.total_deuda)} (${prop.creditos_activos} creditos)`
  }).join('\n\n')

  return `*🏠 Propietarios*

Total: ${resumen.total}
Con creditos activos: ${resumen.conCreditosActivos}
Deuda total: ${formatearMoneda(resumen.totalDeuda)}

*Top 10 por deuda:*

${lista}

_Usa /prop nombre para buscar_`
}

async function comandoBuscarPropietario(buscar: string): Promise<string> {
  const propietarios = await obtenerPropietarios(buscar)

  if (propietarios.length === 0) {
    return `No se encontraron propietarios con "${buscar}"`
  }

  const lista = propietarios.slice(0, 5).map(prop => {
    const activo = prop.creditos_activos > 0 ? '🟢' : '⚪'
    return `${activo} *${prop.full_name}*
📧 ${prop.email || 'Sin email'}
📱 ${prop.phone || 'Sin telefono'}
💰 Deuda: ${formatearMoneda(prop.total_deuda)}
📊 Creditos: ${prop.creditos_activos} activos / ${prop.creditos_count} total`
  }).join('\n\n')

  return `*Propietarios (${propietarios.length} encontrados)*\n\n${lista}`
}

// =====================
// COMANDO DE TASAS
// =====================

async function comandoTasas(): Promise<string> {
  try {
    const data = await obtenerTasas()

    if (!data.success) {
      return 'Error al obtener las tasas oficiales.'
    }

    const tasaUsura = data.tasa_usura_ea ?? 'N/D'
    const tasaMoraDiaria = data.tasa_mora_diaria
      ? (data.tasa_mora_diaria * 100).toFixed(4) + '%'
      : 'N/D'
    const tasaMoraMensual = data.tasa_mora_mensual
      ? (data.tasa_mora_mensual * 100).toFixed(2) + '%'
      : 'N/D'

    // Buscar IBC en las tasas
    const ibcConsumo = data.tasas.find(t => t.tipo === 'ibc_consumo')
    const ibc = ibcConsumo ? `${ibcConsumo.tasa_ea}%` : 'N/D'

    return `*📈 Tasas Oficiales*
_Superintendencia Financiera de Colombia_

📅 Fecha: ${data.fecha_consulta}

*Tasas de Referencia*
IBC Consumo: ${ibc} EA
Tasa de Usura: ${tasaUsura}% EA

*Tasa de Mora*
Diaria: ${tasaMoraDiaria}
Mensual: ${tasaMoraMensual}

_La tasa de mora maxima legal es la tasa de usura (1.5x el IBC)_`
  } catch (error) {
    console.error('Error obteniendo tasas:', error)
    return 'Error al consultar las tasas. Intenta mas tarde.'
  }
}
