// Configuración del bot de WhatsApp
export const config = {
  // API de Aluri
  apiBaseUrl: process.env.ALURI_API_URL || 'https://aluri.co/api',
  apiKey: process.env.ALURI_API_KEY || '',

  // Números autorizados (formato: 573001234567)
  // Si está vacío, acepta mensajes de cualquier número
  numerosAutorizados: process.env.NUMEROS_AUTORIZADOS?.split(',') || [],

  // Prefijo de comandos (opcional)
  prefijo: '/',
}

// Validar configuración
export function validarConfig(): boolean {
  if (!config.apiKey) {
    console.error('ERROR: ALURI_API_KEY no está configurada')
    return false
  }
  return true
}
