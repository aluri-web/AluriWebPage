# Despliegue del Bot de WhatsApp en AWS

## Opción 1: AWS Lightsail (Recomendado - Más fácil)

### Paso 1: Crear instancia Lightsail
1. Ve a https://lightsail.aws.amazon.com
2. Click "Create instance"
3. Selecciona:
   - Region: US East (N. Virginia) o la más cercana
   - Platform: Linux/Unix
   - Blueprint: Ubuntu 22.04 LTS
   - Instance plan: $5/mes (1GB RAM, 1 vCPU)
4. Nombre: `aluri-whatsapp-bot`
5. Click "Create instance"

### Paso 2: Conectar a la instancia
```bash
# Descarga la SSH key desde Lightsail console
ssh -i LightsailDefaultKey.pem ubuntu@<IP_PUBLICA>
```

### Paso 3: Instalar dependencias
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Git
sudo apt install -y git

# Verificar instalación
node --version  # Debe ser v20.x
npm --version
```

### Paso 4: Clonar y configurar el bot
```bash
# Clonar repositorio
git clone https://github.com/pcaicedo94/AluriWebPage.git
cd AluriWebPage/whatsapp-bot

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Crear archivo .env
nano .env
```

### Paso 5: Configurar variables de entorno
Pega esto en el archivo `.env` (reemplaza con tus valores reales):
```env
ALURI_API_KEY=tu_api_key_de_aluri
ALURI_API_URL=https://aluri.co/api
NUMEROS_AUTORIZADOS=numero1,numero2@lid,numero3
ANTHROPIC_API_KEY=tu_api_key_de_anthropic
```

**Nota:** Copia las API keys reales desde el archivo `.env` local en tu máquina.

### Paso 6: Configurar PM2 (Process Manager)
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar bot con PM2
pm2 start dist/index.js --name aluri-bot

# Configurar inicio automático
pm2 startup
pm2 save

# Ver logs
pm2 logs aluri-bot
```

### Paso 7: Escanear QR
```bash
# Ver logs para el QR
pm2 logs aluri-bot

# El QR aparecerá en los logs - escanealo con WhatsApp
```

### Comandos útiles de PM2
```bash
pm2 status          # Ver estado
pm2 logs aluri-bot  # Ver logs
pm2 restart aluri-bot  # Reiniciar
pm2 stop aluri-bot     # Detener
```

---

## Opción 2: AWS EC2

Similar a Lightsail pero con más control:

1. Ve a EC2 Dashboard
2. Launch Instance
3. Selecciona Ubuntu 22.04 LTS
4. Instance type: t3.micro (gratis primer año)
5. Configura Security Group:
   - SSH (22) desde tu IP
6. Sigue los pasos 3-7 de Lightsail

---

## Opción 3: Docker en AWS

### Paso 1: Instalar Docker
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
# Logout y login de nuevo
```

### Paso 2: Clonar y configurar
```bash
git clone https://github.com/pcaicedo94/AluriWebPage.git
cd AluriWebPage/whatsapp-bot

# Crear .env (igual que arriba)
nano .env
```

### Paso 3: Construir y ejecutar
```bash
# Compilar TypeScript primero
npm install
npm run build

# Construir imagen Docker
docker-compose build

# Ejecutar
docker-compose up -d

# Ver logs (para QR)
docker-compose logs -f
```

---

## Actualizar el bot

```bash
cd ~/AluriWebPage
git pull
cd whatsapp-bot
npm install
npm run build
pm2 restart aluri-bot
```

---

## Solución de problemas

### Error: Bad MAC / Sesión inválida
```bash
# Eliminar sesión y re-escanear QR
rm -rf auth/
pm2 restart aluri-bot
pm2 logs aluri-bot  # Escanear nuevo QR
```

### Bot no responde
```bash
pm2 logs aluri-bot --lines 100  # Ver últimos 100 logs
```

### Verificar que está corriendo
```bash
pm2 status
curl https://aluri.co/api/tasas  # Verificar API
```
