FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código compilado
COPY dist/ ./dist/

# Crear directorio para auth (sesión de WhatsApp)
RUN mkdir -p /app/auth

# Variables de entorno
ENV NODE_ENV=production

# Comando para ejecutar
CMD ["node", "dist/index.js"]
