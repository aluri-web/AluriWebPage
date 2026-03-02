# Migración Completa de Aluri a Google Cloud Platform

## Arquitectura Actual vs GCP

| Componente | Actual | GCP |
|------------|--------|-----|
| Frontend/API | Vercel | Cloud Run o App Engine |
| Base de datos | Supabase PostgreSQL | Cloud SQL PostgreSQL |
| Autenticación | Supabase Auth | Firebase Auth |
| Storage | Supabase Storage | Cloud Storage |
| WhatsApp Bot | Local | Compute Engine |
| Dominio | Vercel | Cloud DNS |
| SSL | Vercel | Google-managed SSL |
| CDN | Vercel | Cloud CDN |

## Costo Estimado Mensual (GCP)

| Servicio | Especificación | Costo/mes |
|----------|----------------|-----------|
| Cloud Run | 1 vCPU, 512MB | ~$10 |
| Cloud SQL | db-f1-micro | ~$10 |
| Cloud Storage | 10GB | ~$2 |
| Compute Engine (Bot) | e2-micro | ~$5 |
| Cloud DNS | 1 zona | $0.20 |
| Firebase Auth | Gratis hasta 50k usuarios | $0 |
| **Total** | | **~$30/mes** |

---

## Fase 1: Preparación

### 1.1 Crear proyecto en GCP
1. Ve a https://console.cloud.google.com
2. Crear nuevo proyecto: `aluri-production`
3. Habilitar facturación
4. Habilitar APIs necesarias

```bash
# Instalar gcloud CLI
# Windows: https://cloud.google.com/sdk/docs/install
# Mac: brew install google-cloud-sdk

# Inicializar
gcloud init
gcloud config set project aluri-production

# Habilitar APIs
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  compute.googleapis.com \
  dns.googleapis.com
```

### 1.2 Exportar datos de Supabase
```bash
# Exportar base de datos
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Descargar fotos de Supabase Storage
```

---

## Fase 2: Base de Datos (Cloud SQL)

### 2.1 Crear instancia Cloud SQL
```bash
gcloud sql instances create aluri-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=TuPasswordSeguro123! \
  --storage-size=10GB \
  --storage-type=SSD \
  --backup-start-time=03:00

# Crear base de datos
gcloud sql databases create aluri --instance=aluri-db

# Crear usuario
gcloud sql users create aluri_admin \
  --instance=aluri-db \
  --password=TuPasswordSeguro123!
```

### 2.2 Configurar acceso
```bash
# Permitir conexiones desde cualquier IP (desarrollo)
gcloud sql instances patch aluri-db \
  --authorized-networks=0.0.0.0/0

# En producción, usar Cloud SQL Proxy o IP privada
```

### 2.3 Importar datos
```bash
# Obtener IP de la instancia
gcloud sql instances describe aluri-db --format='value(ipAddresses[0].ipAddress)'

# Subir backup a Cloud Storage
gsutil cp backup.sql gs://aluri-backups/

# Importar desde Cloud Storage
gcloud sql import sql aluri-db gs://aluri-backups/backup.sql \
  --database=aluri
```

### 2.4 Conexión desde la aplicación
```bash
# Formato de conexión
# postgresql://aluri_admin:password@/aluri?host=/cloudsql/aluri-production:us-central1:aluri-db

# O con IP pública
# postgresql://aluri_admin:password@<IP>:5432/aluri
```

---

## Fase 3: Storage (Cloud Storage)

### 3.1 Crear bucket
```bash
# Crear bucket
gsutil mb -l us-central1 gs://aluri-storage

# Configurar CORS
cat > cors.json << EOF
[
  {
    "origin": ["https://aluri.co", "http://localhost:3000"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://aluri-storage
```

### 3.2 Hacer públicas las fotos
```bash
# Hacer público el folder de propiedades
gsutil iam ch allUsers:objectViewer gs://aluri-storage
```

### 3.3 Subir fotos
```bash
# Sincronizar fotos
gsutil -m rsync -r ./fotos-creditos gs://aluri-storage/properties/
```

---

## Fase 4: Autenticación (Firebase Auth)

### 4.1 Crear proyecto Firebase
1. Ve a https://console.firebase.google.com
2. "Add project" > selecciona `aluri-production`
3. Habilitar Authentication

### 4.2 Configurar proveedores
1. Authentication > Sign-in method
2. Habilitar Email/Password
3. Habilitar Google (opcional)

### 4.3 Obtener configuración
```javascript
// Firebase config para el frontend
const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "aluri-production.firebaseapp.com",
  projectId: "aluri-production",
  storageBucket: "aluri-production.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};
```

### 4.4 Migrar usuarios
```bash
# Exportar usuarios de Supabase
# Importar a Firebase usando Admin SDK

# Script de migración: scripts/migrate-users-to-firebase.ts
```

---

## Fase 5: Aplicación Next.js

### Opción A: Cloud Run (Recomendado - Serverless)

#### 5A.1 Crear Dockerfile
```dockerfile
# Dockerfile para Cloud Run
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

#### 5A.2 Desplegar a Cloud Run
```bash
# Construir y subir imagen
gcloud builds submit --tag gcr.io/aluri-production/aluri-app

# Desplegar
gcloud run deploy aluri-app \
  --image gcr.io/aluri-production/aluri-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://..." \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

#### 5A.3 Configurar dominio personalizado
```bash
# Mapear dominio
gcloud run domain-mappings create \
  --service aluri-app \
  --domain aluri.co \
  --region us-central1
```

### Opción B: App Engine (PaaS)

#### 5B.1 Crear app.yaml
```yaml
# app.yaml
runtime: nodejs20

instance_class: F2

env_variables:
  DATABASE_URL: "postgresql://..."
  NODE_ENV: "production"

handlers:
  - url: /.*
    script: auto
    secure: always

automatic_scaling:
  min_instances: 0
  max_instances: 5
```

#### 5B.2 Desplegar
```bash
gcloud app deploy
```

### Opción C: Compute Engine (IaaS - Más control)

#### 5C.1 Crear VM
```bash
gcloud compute instances create aluri-app \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

#### 5C.2 Configurar firewall
```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80,tcp:443 \
  --target-tags http-server,https-server
```

#### 5C.3 Configurar servidor
```bash
# SSH a la VM
gcloud compute ssh aluri-app --zone=us-central1-a

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Clonar y configurar
git clone https://github.com/pcaicedo94/AluriWebPage.git
cd AluriWebPage
npm install && npm run build

# PM2
sudo npm install -g pm2
pm2 start npm --name "aluri" -- start
pm2 startup && pm2 save
```

#### 5C.4 Nginx + SSL
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/aluri
# (misma config que en AWS)

sudo certbot --nginx -d aluri.co -d www.aluri.co
```

---

## Fase 6: CDN (Cloud CDN)

### 6.1 Crear Load Balancer con CDN
```bash
# Para Cloud Run, el CDN está incluido
# Para Compute Engine:

# Crear backend service
gcloud compute backend-services create aluri-backend \
  --global \
  --enable-cdn

# Configurar cache
gcloud compute backend-services update aluri-backend \
  --global \
  --cache-mode=CACHE_ALL_STATIC
```

---

## Fase 7: DNS (Cloud DNS)

### 7.1 Crear zona DNS
```bash
gcloud dns managed-zones create aluri-zone \
  --dns-name="aluri.co." \
  --description="Zona DNS para Aluri"
```

### 7.2 Agregar registros
```bash
# Obtener IP de Cloud Run o Compute Engine
# Agregar registro A
gcloud dns record-sets create aluri.co. \
  --zone=aluri-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=<IP>

# Agregar www
gcloud dns record-sets create www.aluri.co. \
  --zone=aluri-zone \
  --type=CNAME \
  --ttl=300 \
  --rrdatas=aluri.co.
```

### 7.3 Actualizar nameservers
```bash
# Ver nameservers de Cloud DNS
gcloud dns managed-zones describe aluri-zone

# Copiar NS records a tu registrador de dominio
```

---

## Fase 8: WhatsApp Bot (Compute Engine)

### 8.1 Crear VM para el bot
```bash
gcloud compute instances create aluri-whatsapp-bot \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB
```

### 8.2 Configurar bot
```bash
# SSH
gcloud compute ssh aluri-whatsapp-bot --zone=us-central1-a

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clonar y configurar
git clone https://github.com/pcaicedo94/AluriWebPage.git
cd AluriWebPage/whatsapp-bot
npm install && npm run build

# Crear .env
nano .env
# (agregar variables de entorno)

# PM2
sudo npm install -g pm2
pm2 start dist/index.js --name aluri-bot
pm2 startup && pm2 save

# Ver QR
pm2 logs aluri-bot
```

---

## Fase 9: CI/CD con Cloud Build

### 9.1 Crear cloudbuild.yaml
```yaml
# cloudbuild.yaml
steps:
  # Instalar dependencias
  - name: 'node:20'
    entrypoint: npm
    args: ['ci']

  # Build
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'build']
    env:
      - 'DATABASE_URL=${_DATABASE_URL}'

  # Construir imagen Docker
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/aluri-app:$COMMIT_SHA', '.']

  # Push a Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aluri-app:$COMMIT_SHA']

  # Desplegar a Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'aluri-app'
      - '--image=gcr.io/$PROJECT_ID/aluri-app:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

substitutions:
  _DATABASE_URL: 'postgresql://...'

images:
  - 'gcr.io/$PROJECT_ID/aluri-app:$COMMIT_SHA'
```

### 9.2 Conectar repositorio
```bash
# Conectar GitHub a Cloud Build
# Console > Cloud Build > Triggers > Connect Repository

# Crear trigger
gcloud builds triggers create github \
  --repo-name=AluriWebPage \
  --repo-owner=pcaicedo94 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## Fase 10: Monitoreo (Cloud Monitoring)

### 10.1 Configurar alertas
```bash
# Crear política de alertas para CPU alta
gcloud alpha monitoring policies create \
  --display-name="High CPU Alert" \
  --condition-filter='metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --condition-threshold-value=0.8 \
  --notification-channels=projects/aluri-production/notificationChannels/xxx
```

### 10.2 Ver logs
```bash
# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aluri-app" --limit=50

# Compute Engine logs
gcloud logging read "resource.type=gce_instance" --limit=50
```

### 10.3 Dashboard
1. Ve a Cloud Monitoring > Dashboards
2. Crear dashboard personalizado
3. Agregar widgets: CPU, memoria, requests, errores

---

## Comparación: Cloud Run vs App Engine vs Compute Engine

| Característica | Cloud Run | App Engine | Compute Engine |
|----------------|-----------|------------|----------------|
| Tipo | Serverless | PaaS | IaaS |
| Escala a cero | ✅ | ❌ | ❌ |
| Cold starts | Sí (~1s) | Mínimos | No |
| Control | Medio | Bajo | Total |
| Costo mínimo | $0 | ~$25/mes | ~$5/mes |
| Mejor para | APIs, apps web | Apps tradicionales | Apps persistentes |

**Recomendación:** Cloud Run para la app web (bajo costo, escala automática).

---

## Checklist de Migración

- [ ] Proyecto GCP creado
- [ ] Cloud SQL funcionando
- [ ] Datos migrados
- [ ] Cloud Storage con fotos
- [ ] Firebase Auth configurado
- [ ] App desplegada (Cloud Run/App Engine/GCE)
- [ ] SSL configurado
- [ ] DNS apuntando a GCP
- [ ] Bot en Compute Engine
- [ ] CI/CD con Cloud Build
- [ ] Monitoreo configurado
- [ ] Backups automatizados

---

## Comandos Útiles

```bash
# Ver todos los recursos
gcloud projects get-iam-policy aluri-production

# Ver costos
gcloud billing accounts list

# SSH a VM
gcloud compute ssh aluri-app --zone=us-central1-a

# Ver logs de Cloud Run
gcloud run services logs read aluri-app --region=us-central1

# Reiniciar Cloud Run
gcloud run services update aluri-app --region=us-central1 --no-traffic
gcloud run services update aluri-app --region=us-central1 --traffic=latest=100
```

---

## Soporte

- Documentación: https://cloud.google.com/docs
- Support: https://console.cloud.google.com/support
- Firebase: https://firebase.google.com/docs
