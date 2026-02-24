import Anthropic from '@anthropic-ai/sdk'
import {
  obtenerCreditos,
  obtenerCreditosEnMora,
  obtenerResumen,
  buscarCredito,
  obtenerInversionistas,
  obtenerResumenInversionistas,
  obtenerPropietarios,
  obtenerResumenPropietarios,
  formatearMoneda
} from './api.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Contexto del sistema para el LLM - información sobre Aluri
const SYSTEM_PROMPT = `Eres el asistente virtual de *Aluri*, una fintech colombiana especializada en creditos hipotecarios respaldados por bienes raices.

=== SOBRE ALURI ===

*Que es Aluri:*
Aluri es una plataforma de crowdlending inmobiliario que conecta inversionistas con propietarios de inmuebles que necesitan liquidez. Los creditos estan 100% respaldados por hipoteca sobre el inmueble.

*Para Propietarios:*
- Obtienen liquidez usando su inmueble como garantia (sin venderlo)
- Creditos desde $50 millones hasta $500 millones COP
- LTV maximo del 50% (prestan hasta la mitad del valor del inmueble)
- Plazos de 12 a 36 meses
- Tasas desde el 1.5% mensual (18% EA aproximadamente)
- Proceso 100% digital, aprobacion en 48-72 horas
- Sin penalizacion por pago anticipado

*Para Inversionistas:*
- Inversion minima desde $50 millones COP
- Rentabilidad promedio: +20% EA
- Pagos mensuales de intereses
- Capital respaldado por garantia hipotecaria real
- Diversificacion entre multiples creditos
- Plataforma regulada y transparente

*Proceso del Credito:*
1. Propietario solicita credito
2. Aluri evalua el inmueble y el perfil del cliente
3. Se publica en el marketplace para inversionistas
4. Inversionistas fondean el credito
5. Se firma hipoteca ante notaria
6. Propietario recibe el dinero
7. Pagos mensuales hasta completar el plazo

*Niveles de Riesgo:*
- A1 (LTV <= 40%): Bajo riesgo, menor tasa
- A2 (LTV 40-50%): Riesgo moderado
- B1 (LTV 50-60%): Riesgo medio
- B2 (LTV > 60%): Riesgo alto, mayor tasa

*Contacto:*
- Web: https://aluri.co
- Email: info@aluri.co
- WhatsApp: Este mismo chat

=== TU ROL ===

- Responder preguntas sobre Aluri, creditos hipotecarios e inversiones
- Consultar el estado de creditos, inversionistas y propietarios
- Explicar conceptos financieros de manera sencilla
- Ser amable, profesional y conciso
- Responder siempre en espanol colombiano

=== COMANDOS DISPONIBLES ===

Menciona estos comandos cuando sea relevante:

📊 Dashboard:
- /resumen - Dashboard completo del sistema

💰 Creditos:
- /creditos - Lista de creditos
- /mora - Creditos en mora
- CR-XXX - Buscar credito especifico
- /pagos CR-XXX - Historial de pagos

👥 Inversionistas:
- /inversionistas - Lista y resumen
- /inv nombre - Buscar inversionista

🏠 Propietarios:
- /propietarios - Lista y resumen
- /prop nombre - Buscar propietario

🤖 Chat:
- /nuevo - Reiniciar conversacion

=== REGLAS ===

- NO des consejos financieros especificos ni recomendaciones de inversion
- NO puedes realizar transacciones ni modificar datos
- Para operaciones complejas o dudas especificas, sugiere contactar a info@aluri.co
- Respuestas cortas y directas (maximo 250 palabras)
- Usa *texto* para negritas cuando quieras resaltar algo
- Usa emojis con moderacion para hacer la conversacion mas amigable
- Si no tienes informacion sobre algo, dilo honestamente`

// Historial de conversaciones por usuario
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant', content: string }>> = new Map()

// Limpiar historial antiguo cada hora
setInterval(() => {
  conversationHistory.clear()
  console.log('🧹 Historial de conversaciones limpiado')
}, 60 * 60 * 1000)

export async function chatConLLM(userId: string, mensaje: string): Promise<string> {
  try {
    // Obtener o crear historial del usuario
    let history = conversationHistory.get(userId) || []

    // Limitar historial a ultimos 10 mensajes
    if (history.length > 10) {
      history = history.slice(-10)
    }

    // SIEMPRE obtener contexto actual del sistema
    const contextoActual = await obtenerContextoCompleto(mensaje)

    // Agregar mensaje del usuario
    history.push({ role: 'user', content: mensaje })

    // Construir el system prompt con contexto actual
    const systemWithContext = SYSTEM_PROMPT + `

=== DATOS ACTUALES DEL SISTEMA ===
${contextoActual}`

    // Llamar a Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemWithContext,
      messages: history,
    })

    // Extraer respuesta
    const respuesta = response.content[0].type === 'text'
      ? response.content[0].text
      : 'No pude generar una respuesta.'

    // Guardar respuesta en historial
    history.push({ role: 'assistant', content: respuesta })
    conversationHistory.set(userId, history)

    return respuesta

  } catch (error) {
    console.error('Error en LLM:', error)

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return 'Error de configuracion del asistente. Por favor contacta a info@aluri.co'
      }
      if (error.status === 429) {
        return 'Estoy recibiendo muchas consultas. Intenta de nuevo en unos segundos.'
      }
    }

    return 'Ocurrio un error al procesar tu mensaje. Intenta de nuevo o usa /ayuda para ver los comandos disponibles.'
  }
}

// Obtener contexto completo del sistema
async function obtenerContextoCompleto(mensaje: string): Promise<string> {
  const contexto: string[] = []
  const mensajeLower = mensaje.toLowerCase()

  try {
    // SIEMPRE obtener resumen general de creditos
    const resumen = await obtenerResumen()
    contexto.push(`*Estado actual de Aluri:*
- Total creditos: ${resumen.total}
- Creditos activos: ${resumen.activos}
- Creditos en mora: ${resumen.enMora}
- En fondeo: ${resumen.publicados}
- Monto activo: ${formatearMoneda(resumen.montoActivo)}`)

    // SIEMPRE obtener resumen de inversionistas
    const invResumen = await obtenerResumenInversionistas()
    contexto.push(`\n*Inversionistas:*
- Total registrados: ${invResumen.total}
- Con inversiones activas: ${invResumen.conInversionesActivas}
- Total invertido: ${formatearMoneda(invResumen.totalInvertido)}`)

    // SIEMPRE obtener resumen de propietarios
    const propResumen = await obtenerResumenPropietarios()
    contexto.push(`\n*Propietarios:*
- Total registrados: ${propResumen.total}
- Con creditos activos: ${propResumen.conCreditosActivos}
- Deuda total: ${formatearMoneda(propResumen.totalDeuda)}`)

    // Si hay creditos en mora, listarlos
    if (resumen.enMora > 0) {
      const enMora = await obtenerCreditosEnMora()
      contexto.push(`\n*Creditos en mora:* ${enMora.map(c => `${c.codigo} (${c.nombre_propietario})`).join(', ')}`)
    }

    // Si menciona un codigo de credito especifico, buscar detalles
    const matchCredito = mensajeLower.match(/cr[-\s]?(\d+)/i)
    if (matchCredito) {
      const codigo = `CR-${matchCredito[1].padStart(3, '0')}`
      const credito = await buscarCredito(codigo)
      if (credito) {
        const estadoEmoji = credito.estado === 'activo' ? '🟢' : credito.estado === 'mora' ? '🔴' : '⚪'
        contexto.push(`\n*Detalle del credito ${credito.codigo}:*
- Estado: ${estadoEmoji} ${credito.estado.toUpperCase()}
- Monto solicitado: ${formatearMoneda(credito.monto_solicitado)}
- Monto financiado: ${formatearMoneda(credito.monto_financiado)}
- Propietario: ${credito.nombre_propietario}`)
      } else {
        contexto.push(`\nNota: No se encontro el credito ${codigo} en el sistema.`)
      }
    }

    // Si pregunta por lista de creditos o cartera
    if (mensajeLower.includes('creditos') || mensajeLower.includes('cartera') || mensajeLower.includes('lista')) {
      const creditos = await obtenerCreditos()
      if (creditos.length > 0) {
        const listaCorta = creditos.slice(0, 10).map(c => {
          const emoji = c.estado === 'activo' ? '🟢' : c.estado === 'mora' ? '🔴' : '⚪'
          return `${emoji} ${c.codigo}: ${formatearMoneda(c.monto_solicitado)} - ${c.nombre_propietario}`
        }).join('\n')
        contexto.push(`\n*Ultimos creditos:*\n${listaCorta}${creditos.length > 10 ? `\n... y ${creditos.length - 10} mas` : ''}`)
      }
    }

    // Si pregunta por inversionistas
    if (mensajeLower.includes('inversionista') || mensajeLower.includes('inversor')) {
      const inversionistas = await obtenerInversionistas()
      const top5 = inversionistas
        .sort((a, b) => b.total_invertido - a.total_invertido)
        .slice(0, 5)
      if (top5.length > 0) {
        const lista = top5.map((inv, idx) =>
          `${idx + 1}. ${inv.full_name}: ${formatearMoneda(inv.total_invertido)} (${inv.inversiones_activas} activas)`
        ).join('\n')
        contexto.push(`\n*Top 5 inversionistas por monto:*\n${lista}`)
      }
    }

    // Si pregunta por propietarios
    if (mensajeLower.includes('propietario') || mensajeLower.includes('deudor')) {
      const propietarios = await obtenerPropietarios()
      const conCreditos = propietarios
        .filter(p => p.creditos_activos > 0)
        .sort((a, b) => b.total_deuda - a.total_deuda)
        .slice(0, 5)
      if (conCreditos.length > 0) {
        const lista = conCreditos.map((prop, idx) =>
          `${idx + 1}. ${prop.full_name}: ${formatearMoneda(prop.total_deuda)} (${prop.creditos_activos} creditos)`
        ).join('\n')
        contexto.push(`\n*Top 5 propietarios por deuda:*\n${lista}`)
      }
    }

    // Info general para preguntas sobre inversiones
    if (mensajeLower.includes('invers') || mensajeLower.includes('rentabilidad') || mensajeLower.includes('ganar') || mensajeLower.includes('retorno')) {
      contexto.push(`\n*Informacion para inversionistas:*
- Rentabilidad promedio: +20% EA
- Inversion minima: $50,000,000 COP
- Los creditos estan respaldados por hipoteca
- Usa /inversionistas para ver el listado completo`)
    }

    // Info general para preguntas sobre solicitar credito
    if (mensajeLower.includes('solicitar') || mensajeLower.includes('pedir') || mensajeLower.includes('necesito') || mensajeLower.includes('credito')) {
      contexto.push(`\n*Informacion para propietarios:*
- Creditos desde $50M hasta $500M COP
- LTV maximo 50% del valor del inmueble
- Plazos de 12 a 36 meses
- Para solicitar: contactar a info@aluri.co`)
    }

  } catch (error) {
    console.error('Error obteniendo contexto:', error)
    contexto.push('(No se pudo obtener informacion actualizada del sistema)')
  }

  return contexto.join('\n')
}

// Limpiar historial de un usuario especifico
export function limpiarHistorial(userId: string): void {
  conversationHistory.delete(userId)
}
