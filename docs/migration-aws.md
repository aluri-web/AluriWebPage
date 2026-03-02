# Migración Completa de Aluri a AWS

## Arquitectura Actual vs AWS

| Componente | Actual | AWS |
|------------|--------|-----|
| Frontend/API | Vercel | AWS Amplify o EC2 + CloudFront |
| Base de datos | Supabase PostgreSQL | Amazon RDS PostgreSQL |
| Autenticación | Supabase Auth | Amazon Cognito |
| Storage | Supabase Storage | Amazon S3 |
| WhatsApp Bot | Local | EC2 o Lightsail |
| Dominio | Vercel | Route 53 |
| SSL | Vercel | ACM (Certificate Manager) |

## Costo Estimado Mensual (AWS)

| Servicio | Especificación | Costo/mes |
|----------|----------------|-----------|
| EC2 (App) | t3.small (2GB RAM) | ~$15 |
| RDS PostgreSQL | db.t3.micro | ~$15 |
| S3 | 10GB + transferencia | ~$3 |
| CloudFront | CDN | ~$5 |
| Lightsail (Bot) | 1GB RAM | $5 |
| Route 53 | Dominio | $0.50 |
| **Total** | | **~$45/mes** |

---

## Fase 1: Preparación

### 1.1 Crear cuenta AWS
1. Ve a https://aws.amazon.com
2. Crea cuenta con tarjeta de crédito
3. Activa MFA para seguridad
4. Crea un usuario IAM con permisos de administrador

### 1.2 Instalar AWS CLI
```bash
# Windows (PowerShell como Admin)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Mac
brew install awscli

# Configurar
aws configure
# AWS Access Key ID: tu_access_key
# AWS Secret Access Key: tu_secret_key
# Default region: us-east-1
# Default output format: json
```

### 1.3 Exportar datos de Supabase
```bash
# Exportar base de datos
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Exportar storage (fotos)
# Descargar manualmente desde Supabase Dashboard > Storage
```

---

## Fase 2: Base de Datos (RDS PostgreSQL)

### 2.1 Crear instancia RDS
```bash
aws rds create-db-instance \
  --db-instance-identifier aluri-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username aluri_admin \
  --master-user-password TuPasswordSeguro123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxx \
  --publicly-accessible \
  --backup-retention-period 7
```

### 2.2 Configurar Security Group
```bash
# Crear security group
aws ec2 create-security-group \
  --group-name aluri-db-sg \
  --description "Security group for Aluri database"

# Permitir PostgreSQL (5432)
aws ec2 authorize-security-group-ingress \
  --group-name aluri-db-sg \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0  # En producción, limitar a IPs específicas
```

### 2.3 Importar datos
```bash
# Obtener endpoint de RDS
aws rds describe-db-instances --db-instance-identifier aluri-db \
  --query 'DBInstances[0].Endpoint.Address'

# Importar backup
psql -h aluri-db.xxx.us-east-1.rds.amazonaws.com \
  -U aluri_admin -d postgres < backup.sql
```

### 2.4 Configurar extensiones necesarias
```sql
-- Conectar a RDS y ejecutar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Fase 3: Storage (S3)

### 3.1 Crear bucket S3
```bash
# Crear bucket
aws s3 mb s3://aluri-storage --region us-east-1

# Configurar CORS
aws s3api put-bucket-cors --bucket aluri-storage --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://aluri.co", "http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

### 3.2 Política de bucket (acceso público para fotos)
```bash
aws s3api put-bucket-policy --bucket aluri-storage --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForProperties",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aluri-storage/properties/*"
    }
  ]
}'
```

### 3.3 Subir fotos existentes
```bash
# Sincronizar fotos desde local/Supabase
aws s3 sync ./fotos-creditos s3://aluri-storage/properties/
```

---

## Fase 4: Autenticación (Cognito)

### 4.1 Crear User Pool
```bash
aws cognito-idp create-user-pool \
  --pool-name aluri-users \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }'
```

### 4.2 Crear App Client
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_xxxxx \
  --client-name aluri-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

### 4.3 Migrar usuarios de Supabase
```sql
-- Exportar usuarios de Supabase
SELECT email, encrypted_password, created_at
FROM auth.users;

-- Script de migración (Node.js)
-- Ver scripts/migrate-users-to-cognito.ts
```

---

## Fase 5: Aplicación Next.js

### Opción A: AWS Amplify (Más fácil)

#### 5A.1 Conectar repositorio
1. Ve a https://console.aws.amazon.com/amplify
2. Click "New app" > "Host web app"
3. Conecta tu repositorio de GitHub
4. Selecciona rama `main`

#### 5A.2 Configurar build
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

#### 5A.3 Variables de entorno
En Amplify Console > App settings > Environment variables:
```
DATABASE_URL=postgresql://aluri_admin:xxx@aluri-db.xxx.rds.amazonaws.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=  # Vacío o migrar a Cognito
AWS_S3_BUCKET=aluri-storage
AWS_REGION=us-east-1
```

### Opción B: EC2 + PM2 (Más control)

#### 5B.1 Crear instancia EC2
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name aluri-key \
  --security-group-ids sg-xxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=aluri-app}]'
```

#### 5B.2 Configurar servidor
```bash
# Conectar
ssh -i aluri-key.pem ubuntu@<IP_PUBLICA>

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Clonar y configurar
git clone https://github.com/pcaicedo94/AluriWebPage.git
cd AluriWebPage
npm install
npm run build

# Crear .env.local
nano .env.local

# Configurar PM2
sudo npm install -g pm2
pm2 start npm --name "aluri" -- start
pm2 startup && pm2 save
```

#### 5B.3 Configurar Nginx
```nginx
# /etc/nginx/sites-available/aluri
server {
    listen 80;
    server_name aluri.co www.aluri.co;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/aluri /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 5B.4 SSL con Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d aluri.co -d www.aluri.co
```

---

## Fase 6: CDN (CloudFront)

### 6.1 Crear distribución
```bash
aws cloudfront create-distribution \
  --origin-domain-name aluri-storage.s3.amazonaws.com \
  --default-root-object index.html
```

### 6.2 Configurar certificado SSL
1. Ve a ACM (Certificate Manager)
2. Request certificate para `aluri.co` y `*.aluri.co`
3. Validar por DNS
4. Asociar certificado a CloudFront

---

## Fase 7: DNS (Route 53)

### 7.1 Crear hosted zone
```bash
aws route53 create-hosted-zone --name aluri.co --caller-reference $(date +%s)
```

### 7.2 Configurar registros
```bash
# A record para app (Amplify o EC2)
aws route53 change-resource-record-sets --hosted-zone-id ZXXXXX --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "aluri.co",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "xxx.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}'
```

### 7.3 Actualizar nameservers en registrador
Copia los NS records de Route 53 a tu registrador de dominio.

---

## Fase 8: WhatsApp Bot (Lightsail)

Ver guía detallada en: [deploy-aws.md](../whatsapp-bot/deploy-aws.md)

---

## Fase 9: CI/CD con GitHub Actions

### 9.1 Crear workflow
```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/AluriWebPage
            git pull
            npm install
            npm run build
            pm2 restart aluri
```

### 9.2 Configurar secrets en GitHub
- `DATABASE_URL`
- `EC2_HOST`
- `EC2_SSH_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## Fase 10: Monitoreo

### 10.1 CloudWatch Alarms
```bash
# Alarma de CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name aluri-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 10.2 Logs
```bash
# Instalar CloudWatch agent en EC2
sudo yum install amazon-cloudwatch-agent
# Configurar para enviar logs de PM2 a CloudWatch
```

---

## Checklist de Migración

- [ ] Cuenta AWS creada y configurada
- [ ] RDS PostgreSQL funcionando
- [ ] Datos migrados de Supabase
- [ ] S3 bucket con fotos
- [ ] Cognito configurado (o mantener Supabase Auth temporalmente)
- [ ] App desplegada (Amplify o EC2)
- [ ] SSL configurado
- [ ] DNS apuntando a AWS
- [ ] Bot de WhatsApp en Lightsail
- [ ] CI/CD configurado
- [ ] Monitoreo activo
- [ ] Backups automatizados

---

## Rollback

Si algo falla, puedes volver a Vercel/Supabase:
1. Cambiar DNS de Route 53 de vuelta a Vercel
2. Reactivar proyecto en Vercel
3. Los datos en Supabase siguen intactos

---

## Soporte

- AWS Support: https://console.aws.amazon.com/support
- Documentación: https://docs.aws.amazon.com
