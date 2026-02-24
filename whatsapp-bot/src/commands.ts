import {
  obtenerCreditos,
  buscarCredito,
  obtenerCreditosEnMora,
  obtenerResumen,
  formatearMoneda,
} from './api.js'

// Procesar mensaje y retornar respuesta
export async function procesarMensaje(texto: string): Promise<string | null> {
  const mensaje = texto.toLowerCase().trim()

  try {
    // Comando: ayuda
    if (mensaje === '/ayuda' || mensaje === '/help' || mensaje === 'ayuda' || mensaje === 'hola') {
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
    if (mensaje === '/mora' || mensaje === 'mora' || mensaje.includes('en mora')) {
      return await comandoMora()
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

    // No es un comando reconocido
    return null

  } catch (error) {
    console.error('Error procesando mensaje:', error)
    return `Error al procesar la solicitud. Por favor intenta de nuevo.`
  }
}

function obtenerAyuda(): string {
  return `*Bot Aluri - Comandos Disponibles*

/resumen - Dashboard general
/creditos - Lista de créditos
/mora - Créditos en mora
/estado CR-001 - Estado de un crédito
CR-001 - Buscar crédito por código

_Escribe cualquier código de crédito para ver su estado_`
}

async function comandoResumen(): Promise<string> {
  const resumen = await obtenerResumen()

  return `*Dashboard Aluri*

Total de créditos: ${resumen.total}
Activos: ${resumen.activos}
En mora: ${resumen.enMora}
Monto total: ${formatearMoneda(resumen.montoTotal)}`
}

async function comandoCreditos(): Promise<string> {
  const creditos = await obtenerCreditos()

  if (creditos.length === 0) {
    return 'No hay créditos registrados.'
  }

  // Mostrar todos los créditos en formato compacto
  const lista = creditos.map(c => {
    const estado = c.estado === 'activo' ? '🟢' : c.estado === 'mora' ? '🔴' : '⚪'
    return `${estado} *${c.codigo}* ${formatearMoneda(c.monto_solicitado)} - ${c.nombre_propietario}`
  }).join('\n')

  return `*Créditos (${creditos.length} total)*\n\n${lista}`
}

async function comandoMora(): Promise<string> {
  const creditos = await obtenerCreditosEnMora()

  if (creditos.length === 0) {
    return '✅ No hay créditos en mora actualmente.'
  }

  const lista = creditos.map(c => {
    return `🔴 *${c.codigo}*\n   ${c.nombre_propietario}\n   Monto: ${formatearMoneda(c.monto_solicitado)}`
  }).join('\n\n')

  return `*Créditos en Mora (${creditos.length})*\n\n${lista}`
}

async function comandoBuscarCredito(codigo: string): Promise<string> {
  const credito = await buscarCredito(codigo)

  if (!credito) {
    return `No se encontró el crédito *${codigo.toUpperCase()}*`
  }

  const estadoEmoji = credito.estado === 'activo' ? '🟢' : credito.estado === 'mora' ? '🔴' : '⚪'

  return `*Crédito ${credito.codigo}*

${estadoEmoji} Estado: ${credito.estado.toUpperCase()}
💰 Monto solicitado: ${formatearMoneda(credito.monto_solicitado)}
📊 Monto financiado: ${formatearMoneda(credito.monto_financiado)}
👤 Propietario: ${credito.nombre_propietario}`
}
