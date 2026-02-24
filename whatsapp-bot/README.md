# Bot de WhatsApp - Aluri

Bot de WhatsApp para consultar créditos, pagos y estados de Aluri.

## Requisitos

- Node.js 18+
- API Key de Aluri (generada en el panel de admin)

## Instalación

```bash
cd whatsapp-bot
npm install
```

## Configuración

1. Crea el archivo `.env`:

```bash
cp .env.example .env
```

2. Edita `.env` y agrega tu API Key:

```
ALURI_API_KEY=aluri_xxxxxxxxxx...
```

## Uso

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm run build
npm start
```

Al iniciar, aparecerá un código QR. Escanéalo con WhatsApp para vincular el bot.

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/ayuda` | Muestra ayuda |
| `/resumen` | Dashboard general |
| `/creditos` | Lista de créditos |
| `/mora` | Créditos en mora |
| `/estado CR-001` | Estado de un crédito |
| `CR-001` | Buscar crédito por código |

## Ejecutar con PM2 (Producción)

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name aluri-whatsapp
pm2 save
```

## Seguridad

- La carpeta `auth/` contiene las credenciales de WhatsApp. **No la compartas ni subas a git.**
- Puedes limitar el bot a números específicos con `NUMEROS_AUTORIZADOS` en `.env`
