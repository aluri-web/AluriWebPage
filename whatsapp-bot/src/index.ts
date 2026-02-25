import 'dotenv/config'
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { config, validarConfig } from './config.js'
import { procesarMensaje } from './commands.js'

// Logger silencioso para Baileys
const logger = pino({ level: 'silent' })

let sock: WASocket | null = null
let intentosReconexion = 0
const MAX_INTENTOS = 5

// Cache para evitar procesar mensajes duplicados
const mensajesProcesados = new Set<string>()
const MAX_CACHE_SIZE = 1000

async function conectarWhatsApp() {
  // Validar configuración
  if (!validarConfig()) {
    process.exit(1)
  }

  console.log('🚀 Iniciando Bot de WhatsApp Aluri...')
  console.log(`📡 API URL: ${config.apiBaseUrl}`)

  try {
    // Obtener última versión de Baileys
    const { version } = await fetchLatestBaileysVersion()
    console.log(`📦 Versión WA: ${version.join('.')}`)

    // Estado de autenticación (guarda las credenciales en ./auth)
    const { state, saveCreds } = await useMultiFileAuthState('./auth')

    // Crear conexión
    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['Aluri Bot', 'Chrome', '120.0.0'],
    })

    // Guardar credenciales cuando cambien
    sock.ev.on('creds.update', saveCreds)

    // Manejar conexión
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // Mostrar QR para vincular
      if (qr) {
        console.log('\n📱 Escanea este código QR con WhatsApp:\n')
        qrcode.generate(qr, { small: true })
        console.log('\n⏳ Esperando escaneo...\n')
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log(`❌ Conexión cerrada. Código: ${statusCode}`)

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('🔐 Sesión cerrada. Elimina la carpeta ./auth y reinicia.')
          process.exit(1)
        } else if (shouldReconnect && intentosReconexion < MAX_INTENTOS) {
          intentosReconexion++
          const delay = Math.min(1000 * intentosReconexion, 10000)
          console.log(`🔄 Reconectando en ${delay / 1000}s... (intento ${intentosReconexion}/${MAX_INTENTOS})`)
          setTimeout(conectarWhatsApp, delay)
        } else if (intentosReconexion >= MAX_INTENTOS) {
          console.log('💀 Máximo de intentos alcanzado. Reinicia manualmente.')
          process.exit(1)
        }
      } else if (connection === 'open') {
        intentosReconexion = 0
        console.log('✅ Conectado a WhatsApp!')
        console.log('📨 Esperando mensajes...\n')
      }
    })

    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        // Ignorar mensajes propios y de grupos
        if (msg.key.fromMe) continue
        if (msg.key.remoteJid?.endsWith('@g.us')) continue

        // Evitar procesar mensajes duplicados
        const msgId = msg.key.id
        if (!msgId || mensajesProcesados.has(msgId)) continue
        mensajesProcesados.add(msgId)

        // Limpiar cache si es muy grande
        if (mensajesProcesados.size > MAX_CACHE_SIZE) {
          const idsArray = Array.from(mensajesProcesados)
          idsArray.slice(0, 500).forEach(id => mensajesProcesados.delete(id))
        }

        // Obtener número del remitente
        const remitente = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''

        // Verificar si el número está autorizado (si hay lista)
        if (config.numerosAutorizados.length > 0) {
          const remoteJid = msg.key.remoteJid || ''
          const esLid = remoteJid.endsWith('@lid')

          // Para @lid: comparar el ID completo (ej: 90847836143729@lid)
          // Para números normales: comparar solo dígitos
          const autorizado = config.numerosAutorizados.some(n => {
            if (esLid) {
              return n === remitente || n === remoteJid
            }
            return n.replace(/\D/g, '') === remitente.replace(/\D/g, '')
          })

          if (!autorizado) {
            console.log(`🚫 Mensaje de número no autorizado: ${remitente}`)
            continue
          }
        }

        // Obtener texto del mensaje
        const texto = extraerTexto(msg.message)
        if (!texto) continue

        console.log(`📩 ${remitente}: ${texto}`)

        // Procesar comando (pasar remitente como userId para el LLM)
        const respuesta = await procesarMensaje(texto, remitente)

        if (respuesta) {
          console.log(`📤 Respondiendo a ${remitente}`)
          await sock?.sendMessage(msg.key.remoteJid!, { text: respuesta })
        }
      }
    })

  } catch (error) {
    console.error('Error iniciando bot:', error)
    if (intentosReconexion < MAX_INTENTOS) {
      intentosReconexion++
      console.log(`🔄 Reintentando en 5s... (intento ${intentosReconexion}/${MAX_INTENTOS})`)
      setTimeout(conectarWhatsApp, 5000)
    } else {
      process.exit(1)
    }
  }
}

// Extraer texto de diferentes tipos de mensaje
function extraerTexto(message: proto.IMessage | null | undefined): string | null {
  if (!message) return null

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  )
}

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando bot...')
  sock?.end(undefined)
  process.exit(0)
})

// Iniciar
conectarWhatsApp()
