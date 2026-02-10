# Diseño de Base de Datos para Fintech de Préstamos

## Tipo de Base de Datos Recomendada

Para una fintech de préstamos, la mejor opción es una **base de datos relacional (RDBMS)** como **PostgreSQL** o **MySQL**.

### Razones para elegir PostgreSQL:

- Cumplimiento ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad) - fundamental para transacciones financieras
- Excelente manejo de JSON para datos semi-estructurados
- Capacidades robustas de auditoría
- Particionamiento nativo para escalar
- Tipos de datos especiales para dinero (NUMERIC con precisión exacta, nunca FLOAT)
- Soporte para replicación y alta disponibilidad

---

## Estructura de Tablas - ¡NO una tabla por crédito!

**IMPORTANTE**: Crear una tabla por cada crédito es una práctica completamente errónea y antitécnica. 

**Problemas de esta aproximación:**
- Con 10,000 créditos tendrías 10,000 tablas
- Inmanejable para consultas y reportes
- Imposible de escalar
- Viola principios básicos de diseño de bases de datos
- No permite queries eficientes entre créditos

---

## Diseño Normalizado Correcto

### 1. Tabla: clientes

```sql
CREATE TABLE clientes (
    cliente_id BIGSERIAL PRIMARY KEY,
    identificacion VARCHAR(50) UNIQUE NOT NULL,
    tipo_identificacion VARCHAR(10), -- CC, NIT, CE, etc.
    nombre_completo VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    score_crediticio INTEGER,
    estado VARCHAR(20), -- activo, bloqueado, inactivo
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_estado CHECK (estado IN ('activo', 'bloqueado', 'inactivo'))
);

CREATE INDEX idx_clientes_identificacion ON clientes(identificacion);
CREATE INDEX idx_clientes_estado ON clientes(estado);
```

**Propósito**: Almacena información maestra de los clientes. Un cliente puede tener múltiples créditos a lo largo del tiempo.

---

### 2. Tabla: creditos

```sql
CREATE TABLE creditos (
    credito_id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(cliente_id),
    numero_credito VARCHAR(50) UNIQUE NOT NULL,
    monto_solicitado NUMERIC(15,2) NOT NULL,
    monto_aprobado NUMERIC(15,2) NOT NULL,
    tasa_interes NUMERIC(5,2) NOT NULL, -- Ejemplo: 2.5 para 2.5%
    plazo_meses INTEGER NOT NULL,
    fecha_desembolso DATE,
    fecha_primer_pago DATE,
    fecha_ultimo_pago DATE,
    producto VARCHAR(50), -- consumo, microcrédito, vivienda
    estado VARCHAR(30), -- solicitado, aprobado, desembolsado, vigente, pagado, castigado
    saldo_capital NUMERIC(15,2) DEFAULT 0,
    saldo_intereses NUMERIC(15,2) DEFAULT 0,
    saldo_mora NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX idx_creditos_estado ON creditos(estado);
CREATE INDEX idx_creditos_numero ON creditos(numero_credito);
CREATE INDEX idx_creditos_fecha_desembolso ON creditos(fecha_desembolso);
```

**Propósito**: Información maestra de cada crédito. Contiene los saldos actualizados en tiempo real.

---

### 3. Tabla: plan_pagos

```sql
CREATE TABLE plan_pagos (
    plan_pago_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    numero_cuota INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    valor_cuota NUMERIC(15,2) NOT NULL,
    capital NUMERIC(15,2) NOT NULL,
    intereses NUMERIC(15,2) NOT NULL,
    saldo_capital NUMERIC(15,2) NOT NULL,
    estado VARCHAR(20), -- pendiente, pagada, vencida, castigada
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(credito_id, numero_cuota)
);

CREATE INDEX idx_plan_pagos_credito ON plan_pagos(credito_id);
CREATE INDEX idx_plan_pagos_vencimiento ON plan_pagos(fecha_vencimiento);
CREATE INDEX idx_plan_pagos_estado ON plan_pagos(estado);
```

**Propósito**: Liquidación inicial del crédito con el calendario de pagos proyectado.

---

### 4. Tabla: transacciones

```sql
CREATE TABLE transacciones (
    transaccion_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    tipo_transaccion VARCHAR(50), -- desembolso, pago_capital, pago_interes, pago_mora, servicio_legal, castigo
    concepto VARCHAR(200),
    monto NUMERIC(15,2) NOT NULL,
    fecha_transaccion TIMESTAMP NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    numero_cuota INTEGER,
    referencia_pago VARCHAR(100),
    metodo_pago VARCHAR(30), -- transferencia, efectivo, PSE, tarjeta
    usuario_registro VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transacciones_credito ON transacciones(credito_id, fecha_aplicacion);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_aplicacion);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo_transaccion);
CREATE INDEX idx_transacciones_referencia ON transacciones(referencia_pago);
```

**Propósito**: Registro inmutable de TODOS los movimientos del crédito. Event sourcing completo.

**Tipos de transacción importantes:**
- `desembolso`: Entrega del dinero al cliente
- `pago_capital`: Abono al saldo principal
- `pago_interes`: Pago de intereses corrientes
- `pago_mora`: Pago de intereses moratorios
- `servicio_legal`: Cargos por gestión de cobranza
- `causacion_interes`: Intereses devengados
- `causacion_mora`: Mora devengada
- `castigo`: Crédito dado de baja
- `reverso`: Anulación de una transacción previa

---

### 5. Tabla: liquidaciones_mensuales

```sql
CREATE TABLE liquidaciones_mensuales (
    liquidacion_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    periodo DATE NOT NULL, -- Primer día del mes (ej: 2024-01-01)
    saldo_inicial_capital NUMERIC(15,2),
    saldo_final_capital NUMERIC(15,2),
    capital_pagado NUMERIC(15,2) DEFAULT 0,
    intereses_corrientes_causados NUMERIC(15,2) DEFAULT 0,
    intereses_corrientes_pagados NUMERIC(15,2) DEFAULT 0,
    intereses_mora_causados NUMERIC(15,2) DEFAULT 0,
    intereses_mora_pagados NUMERIC(15,2) DEFAULT 0,
    servicios_legales NUMERIC(15,2) DEFAULT 0,
    otros_cargos NUMERIC(15,2) DEFAULT 0,
    dias_mora INTEGER DEFAULT 0,
    tasa_aplicada NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(credito_id, periodo)
);

CREATE INDEX idx_liquidaciones_credito ON liquidaciones_mensuales(credito_id);
CREATE INDEX idx_liquidaciones_periodo ON liquidaciones_mensuales(periodo);
```

**Propósito**: Snapshot mensual del estado del crédito para reportería y cumplimiento regulatorio. Facilita consultas históricas sin procesar millones de transacciones.

---

### 6. Tabla: auditoria

```sql
CREATE TABLE auditoria (
    auditoria_id BIGSERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(50),
    registro_id BIGINT,
    operacion VARCHAR(10), -- INSERT, UPDATE, DELETE
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario VARCHAR(100),
    ip_address VARCHAR(45),
    timestamp_operacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tabla ON auditoria(tabla_afectada, registro_id);
CREATE INDEX idx_auditoria_timestamp ON auditoria(timestamp_operacion);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario);
```

**Propósito**: Trazabilidad completa de cambios. Crítico para auditorías, compliance y resolución de disputas.

**Implementación con trigger (ejemplo):**

```sql
CREATE OR REPLACE FUNCTION auditoria_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria(tabla_afectada, registro_id, operacion, datos_anteriores, usuario)
        VALUES (TG_TABLE_NAME, OLD.credito_id, 'DELETE', row_to_json(OLD), current_user);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria(tabla_afectada, registro_id, operacion, datos_anteriores, datos_nuevos, usuario)
        VALUES (TG_TABLE_NAME, NEW.credito_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria(tabla_afectada, registro_id, operacion, datos_nuevos, usuario)
        VALUES (TG_TABLE_NAME, NEW.credito_id, 'INSERT', row_to_json(NEW), current_user);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tabla créditos
CREATE TRIGGER creditos_auditoria
AFTER INSERT OR UPDATE OR DELETE ON creditos
FOR EACH ROW EXECUTE FUNCTION auditoria_trigger_func();
```

---

### 7. Tablas Complementarias (Opcionales pero Recomendadas)

#### Tabla: garantias

```sql
CREATE TABLE garantias (
    garantia_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    tipo_garantia VARCHAR(50), -- hipotecaria, prendaria, personal, ninguna
    descripcion TEXT,
    valor_comercial NUMERIC(15,2),
    valor_avaluo NUMERIC(15,2),
    fecha_avaluo DATE,
    estado VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: codeudores

```sql
CREATE TABLE codeudores (
    codeudor_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    cliente_id BIGINT REFERENCES clientes(cliente_id),
    tipo_vinculacion VARCHAR(30), -- codeudor, fiador, avalista
    porcentaje_responsabilidad NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: gestiones_cobranza

```sql
CREATE TABLE gestiones_cobranza (
    gestion_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    fecha_gestion TIMESTAMP NOT NULL,
    tipo_gestion VARCHAR(50), -- llamada, email, SMS, visita, judicial
    resultado VARCHAR(100), -- contacto_efectivo, promesa_pago, no_contacto
    observaciones TEXT,
    usuario_gestion VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Arquitectura de Datos

### Arquitectura de 3 Capas

#### 1. Capa Transaccional (OLTP)
**Base de datos**: PostgreSQL Principal
**Propósito**: Operaciones del día a día
**Características**:
- Alta disponibilidad (99.99%)
- Réplicas síncronas para escritura
- Backups cada 15 minutos
- Retención de 30 días en hot storage

#### 2. Capa Analítica (OLAP)
**Base de datos**: Data Warehouse (Snowflake, Redshift, BigQuery)
**Propósito**: Reportería, analytics, cumplimiento regulatorio
**Características**:
- Datos históricos completos (5+ años)
- Tablas desnormalizadas para consultas rápidas
- Actualización batch (cada hora o diaria según necesidad)
- Particionamiento agresivo por fecha

#### 3. Capa de Réplicas de Lectura
**Base de datos**: Réplicas PostgreSQL (asíncronas)
**Propósito**: Distribuir carga de consultas
**Características**:
- 2-3 réplicas para balanceo de carga
- Consultas de reportes y dashboards
- APIs públicas consumen de réplicas
- Lag máximo de 1-2 segundos

### Diagrama de Flujo de Datos

```
┌─────────────────┐
│   Aplicación    │
│   (Backend)     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬─────────────┐
         │              │              │             │
         ▼              ▼              ▼             ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ PostgreSQL  │  │ Réplica  │  │ Réplica  │  │  Cache   │
│  Principal  │──│ Lectura  │  │ Lectura  │  │  Redis   │
│   (OLTP)    │  │    #1    │  │    #2    │  │          │
└──────┬──────┘  └──────────┘  └──────────┘  └──────────┘
       │
       │ ETL Batch (cada hora)
       │
       ▼
┌─────────────┐
│    Data     │
│  Warehouse  │
│   (OLAP)    │
└─────────────┘
```

---

## Particionamiento para Retención de 5 Años

### Estrategia de Particionamiento

Para manejar eficientemente grandes volúmenes de datos históricos, implementa particionamiento por fecha en las tablas con alto volumen:

#### Particionamiento de la tabla transacciones

```sql
-- Crear tabla padre con particionamiento
CREATE TABLE transacciones (
    transaccion_id BIGSERIAL,
    credito_id BIGINT NOT NULL,
    tipo_transaccion VARCHAR(50) NOT NULL,
    concepto VARCHAR(200),
    monto NUMERIC(15,2) NOT NULL,
    fecha_transaccion TIMESTAMP NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    numero_cuota INTEGER,
    referencia_pago VARCHAR(100),
    metodo_pago VARCHAR(30),
    usuario_registro VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (transaccion_id, fecha_aplicacion)
) PARTITION BY RANGE (fecha_aplicacion);

-- Crear particiones por mes
CREATE TABLE transacciones_2024_01 PARTITION OF transacciones
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transacciones_2024_02 PARTITION OF transacciones
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE transacciones_2024_03 PARTITION OF transacciones
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- ... y así sucesivamente
```

#### Script para crear particiones automáticamente

```sql
-- Función para crear particiones futuras
CREATE OR REPLACE FUNCTION crear_particiones_mensuales(
    tabla_base VARCHAR,
    fecha_inicio DATE,
    num_meses INTEGER
)
RETURNS VOID AS $$
DECLARE
    fecha_actual DATE := fecha_inicio;
    fecha_siguiente DATE;
    nombre_particion VARCHAR;
    i INTEGER;
BEGIN
    FOR i IN 0..(num_meses - 1) LOOP
        fecha_siguiente := fecha_actual + INTERVAL '1 month';
        nombre_particion := tabla_base || '_' || TO_CHAR(fecha_actual, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            nombre_particion,
            tabla_base,
            fecha_actual,
            fecha_siguiente
        );
        
        fecha_actual := fecha_siguiente;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Crear particiones para los próximos 12 meses
SELECT crear_particiones_mensuales('transacciones', '2024-01-01', 12);
```

#### Mantenimiento y eliminación de particiones antiguas

```sql
-- Eliminar particiones de hace más de 5 años
CREATE OR REPLACE FUNCTION limpiar_particiones_antiguas(
    tabla_base VARCHAR,
    años_retencion INTEGER
)
RETURNS VOID AS $$
DECLARE
    fecha_limite DATE := CURRENT_DATE - (años_retencion || ' years')::INTERVAL;
    particion RECORD;
BEGIN
    FOR particion IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE tabla_base || '_%'
        AND schemaname = 'public'
    LOOP
        -- Extraer fecha de la partición y compararla
        IF TO_DATE(SUBSTRING(particion.tablename FROM '\d{4}_\d{2}'), 'YYYY_MM') < fecha_limite THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', particion.tablename);
            RAISE NOTICE 'Eliminada partición: %', particion.tablename;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar mensualmente vía cron job
SELECT limpiar_particiones_antiguas('transacciones', 5);
```

### Ventajas del Particionamiento

1. **Consultas más rápidas**: Las queries solo escanean particiones relevantes
2. **Mantenimiento eficiente**: Vacuuming y reindexado por partición
3. **Eliminación rápida**: Drop de partición antigua es instantáneo vs DELETE masivo
4. **Menor uso de disco**: Particiones antiguas pueden comprimirse
5. **Mejor organización**: Datos separados por tiempo facilita archivado

---

## Proceso de Liquidación Mensual

### Flujo del Proceso

#### Paso 1: Causación Automática (Cierre de Mes)

```sql
-- Stored procedure para causación mensual
CREATE OR REPLACE FUNCTION causar_liquidacion_mensual(mes_periodo DATE)
RETURNS TABLE(creditos_procesados INTEGER, errores INTEGER) AS $$
DECLARE
    credito RECORD;
    dias_mes INTEGER;
    intereses_causados NUMERIC(15,2);
    mora_causada NUMERIC(15,2);
    dias_mora_actual INTEGER;
    total_procesados INTEGER := 0;
    total_errores INTEGER := 0;
BEGIN
    -- Para cada crédito vigente
    FOR credito IN 
        SELECT * FROM creditos 
        WHERE estado IN ('vigente', 'desembolsado')
        AND fecha_desembolso <= mes_periodo
    LOOP
        BEGIN
            -- Calcular días del mes
            dias_mes := EXTRACT(DAY FROM (mes_periodo + INTERVAL '1 month' - INTERVAL '1 day'));
            
            -- Calcular intereses corrientes del mes
            intereses_causados := (credito.saldo_capital * credito.tasa_interes / 100) * dias_mes / 30;
            
            -- Calcular días de mora
            dias_mora_actual := GREATEST(0, (mes_periodo - (
                SELECT MIN(fecha_vencimiento) 
                FROM plan_pagos 
                WHERE credito_id = credito.credito_id 
                AND estado = 'vencida'
            ))::INTEGER);
            
            -- Calcular mora si aplica (ejemplo: tasa_mora = tasa_interes * 1.5)
            IF dias_mora_actual > 0 THEN
                mora_causada := credito.saldo_capital * (credito.tasa_interes * 1.5 / 100) * dias_mora_actual / 30;
            ELSE
                mora_causada := 0;
            END IF;
            
            -- Insertar en liquidaciones_mensuales
            INSERT INTO liquidaciones_mensuales (
                credito_id,
                periodo,
                saldo_inicial_capital,
                saldo_final_capital,
                intereses_corrientes_causados,
                intereses_mora_causados,
                dias_mora,
                tasa_aplicada
            ) VALUES (
                credito.credito_id,
                mes_periodo,
                credito.saldo_capital,
                credito.saldo_capital, -- Se actualizará con pagos
                intereses_causados,
                mora_causada,
                dias_mora_actual,
                credito.tasa_interes
            )
            ON CONFLICT (credito_id, periodo) DO UPDATE
            SET intereses_corrientes_causados = EXCLUDED.intereses_corrientes_causados,
                intereses_mora_causados = EXCLUDED.intereses_mora_causados,
                dias_mora = EXCLUDED.dias_mora;
            
            -- Crear transacciones de causación
            IF intereses_causados > 0 THEN
                INSERT INTO transacciones (
                    credito_id,
                    tipo_transaccion,
                    concepto,
                    monto,
                    fecha_transaccion,
                    fecha_aplicacion,
                    usuario_registro
                ) VALUES (
                    credito.credito_id,
                    'causacion_interes',
                    'Intereses causados ' || TO_CHAR(mes_periodo, 'Mon YYYY'),
                    intereses_causados,
                    NOW(),
                    mes_periodo,
                    'SISTEMA'
                );
                
                -- Actualizar saldo de intereses
                UPDATE creditos 
                SET saldo_intereses = saldo_intereses + intereses_causados
                WHERE credito_id = credito.credito_id;
            END IF;
            
            IF mora_causada > 0 THEN
                INSERT INTO transacciones (
                    credito_id,
                    tipo_transaccion,
                    concepto,
                    monto,
                    fecha_transaccion,
                    fecha_aplicacion,
                    usuario_registro
                ) VALUES (
                    credito.credito_id,
                    'causacion_mora',
                    'Mora causada ' || TO_CHAR(mes_periodo, 'Mon YYYY'),
                    mora_causada,
                    NOW(),
                    mes_periodo,
                    'SISTEMA'
                );
                
                -- Actualizar saldo de mora
                UPDATE creditos 
                SET saldo_mora = saldo_mora + mora_causada
                WHERE credito_id = credito.credito_id;
            END IF;
            
            total_procesados := total_procesados + 1;
            
        EXCEPTION WHEN OTHERS THEN
            total_errores := total_errores + 1;
            -- Log del error
            RAISE WARNING 'Error procesando crédito %: %', credito.credito_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT total_procesados, total_errores;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar mensualmente
SELECT * FROM causar_liquidacion_mensual('2024-01-31');
```

#### Paso 2: Aplicación de Pagos

```sql
-- Función para aplicar un pago siguiendo el orden legal
CREATE OR REPLACE FUNCTION aplicar_pago(
    p_credito_id BIGINT,
    p_monto_pago NUMERIC(15,2),
    p_referencia VARCHAR(100),
    p_metodo_pago VARCHAR(30),
    p_fecha_pago DATE
)
RETURNS TABLE(
    aplicado_servicios NUMERIC(15,2),
    aplicado_mora NUMERIC(15,2),
    aplicado_intereses NUMERIC(15,2),
    aplicado_capital NUMERIC(15,2),
    saldo_restante NUMERIC(15,2)
) AS $$
DECLARE
    v_credito RECORD;
    v_monto_restante NUMERIC(15,2);
    v_aplicado_servicios NUMERIC(15,2) := 0;
    v_aplicado_mora NUMERIC(15,2) := 0;
    v_aplicado_intereses NUMERIC(15,2) := 0;
    v_aplicado_capital NUMERIC(15,2) := 0;
BEGIN
    -- Obtener información del crédito
    SELECT * INTO v_credito FROM creditos WHERE credito_id = p_credito_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Crédito no encontrado';
    END IF;
    
    v_monto_restante := p_monto_pago;
    
    -- 1. Aplicar a servicios legales (si existen)
    -- (Aquí deberías tener una lógica para obtener servicios legales pendientes)
    
    -- 2. Aplicar a mora
    IF v_monto_restante > 0 AND v_credito.saldo_mora > 0 THEN
        v_aplicado_mora := LEAST(v_monto_restante, v_credito.saldo_mora);
        
        INSERT INTO transacciones (
            credito_id, tipo_transaccion, concepto, monto,
            fecha_transaccion, fecha_aplicacion, referencia_pago, metodo_pago
        ) VALUES (
            p_credito_id, 'pago_mora', 'Pago intereses moratorios',
            v_aplicado_mora, NOW(), p_fecha_pago, p_referencia, p_metodo_pago
        );
        
        UPDATE creditos 
        SET saldo_mora = saldo_mora - v_aplicado_mora
        WHERE credito_id = p_credito_id;
        
        v_monto_restante := v_monto_restante - v_aplicado_mora;
    END IF;
    
    -- 3. Aplicar a intereses corrientes
    IF v_monto_restante > 0 AND v_credito.saldo_intereses > 0 THEN
        v_aplicado_intereses := LEAST(v_monto_restante, v_credito.saldo_intereses);
        
        INSERT INTO transacciones (
            credito_id, tipo_transaccion, concepto, monto,
            fecha_transaccion, fecha_aplicacion, referencia_pago, metodo_pago
        ) VALUES (
            p_credito_id, 'pago_interes', 'Pago intereses corrientes',
            v_aplicado_intereses, NOW(), p_fecha_pago, p_referencia, p_metodo_pago
        );
        
        UPDATE creditos 
        SET saldo_intereses = saldo_intereses - v_aplicado_intereses
        WHERE credito_id = p_credito_id;
        
        v_monto_restante := v_monto_restante - v_aplicado_intereses;
    END IF;
    
    -- 4. Aplicar a capital
    IF v_monto_restante > 0 AND v_credito.saldo_capital > 0 THEN
        v_aplicado_capital := LEAST(v_monto_restante, v_credito.saldo_capital);
        
        INSERT INTO transacciones (
            credito_id, tipo_transaccion, concepto, monto,
            fecha_transaccion, fecha_aplicacion, referencia_pago, metodo_pago
        ) VALUES (
            p_credito_id, 'pago_capital', 'Pago abono a capital',
            v_aplicado_capital, NOW(), p_fecha_pago, p_referencia, p_metodo_pago
        );
        
        UPDATE creditos 
        SET saldo_capital = saldo_capital - v_aplicado_capital
        WHERE credito_id = p_credito_id;
        
        v_monto_restante := v_monto_restante - v_aplicado_capital;
        
        -- Actualizar cuotas pagadas en plan_pagos
        UPDATE plan_pagos
        SET estado = 'pagada'
        WHERE credito_id = p_credito_id
        AND estado = 'pendiente'
        AND saldo_capital >= v_credito.saldo_capital - v_aplicado_capital;
    END IF;
    
    -- Actualizar liquidación mensual
    UPDATE liquidaciones_mensuales
    SET capital_pagado = capital_pagado + v_aplicado_capital,
        intereses_corrientes_pagados = intereses_corrientes_pagados + v_aplicado_intereses,
        intereses_mora_pagados = intereses_mora_pagados + v_aplicado_mora,
        saldo_final_capital = v_credito.saldo_capital - v_aplicado_capital
    WHERE credito_id = p_credito_id
    AND periodo = DATE_TRUNC('month', p_fecha_pago);
    
    -- Verificar si el crédito está totalmente pagado
    IF (v_credito.saldo_capital - v_aplicado_capital) = 0 
       AND (v_credito.saldo_intereses - v_aplicado_intereses) = 0 
       AND (v_credito.saldo_mora - v_aplicado_mora) = 0 THEN
        UPDATE creditos SET estado = 'pagado' WHERE credito_id = p_credito_id;
    END IF;
    
    RETURN QUERY SELECT 
        v_aplicado_servicios,
        v_aplicado_mora,
        v_aplicado_intereses,
        v_aplicado_capital,
        v_monto_restante;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso
SELECT * FROM aplicar_pago(123, 500000.00, 'REF-001', 'transferencia', '2024-01-15');
```

#### Paso 3: Jobs Automáticos (Scheduler)

```python
# Ejemplo con Apache Airflow
from airflow import DAG
from airflow.operators.postgres_operator import PostgresOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'fintech',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['alertas@fintech.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

# DAG para causación mensual
dag = DAG(
    'liquidacion_mensual',
    default_args=default_args,
    description='Causación de intereses y mora al cierre de mes',
    schedule_interval='0 1 1 * *',  # 1 AM del día 1 de cada mes
    catchup=False
)

causar_liquidaciones = PostgresOperator(
    task_id='causar_liquidaciones_mes',
    postgres_conn_id='fintech_db',
    sql="""
        SELECT * FROM causar_liquidacion_mensual(
            (CURRENT_DATE - INTERVAL '1 month')::DATE
        );
    """,
    dag=dag
)

verificar_cuadratura = PostgresOperator(
    task_id='verificar_cuadratura',
    postgres_conn_id='fintech_db',
    sql="""
        -- Verificar que suma de transacciones = saldos
        SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    RAISE EXCEPTION 'Descuadre detectado en % créditos', COUNT(*)
                ELSE 
                    NULL
            END
        FROM (
            SELECT c.credito_id,
                   c.saldo_capital,
                   COALESCE(SUM(t.monto) FILTER (WHERE tipo_transaccion = 'desembolso'), 0) -
                   COALESCE(SUM(t.monto) FILTER (WHERE tipo_transaccion = 'pago_capital'), 0) as calculado
            FROM creditos c
            LEFT JOIN transacciones t ON c.credito_id = t.credito_id
            WHERE c.estado IN ('vigente', 'desembolsado')
            GROUP BY c.credito_id, c.saldo_capital
            HAVING ABS(c.saldo_capital - calculado) > 0.01
        ) descuadres;
    """,
    dag=dag
)

enviar_reporte = PostgresOperator(
    task_id='enviar_reporte_liquidacion',
    postgres_conn_id='fintech_db',
    sql="""
        -- Generar reporte de liquidaciones del mes
        COPY (
            SELECT 
                c.numero_credito,
                cl.identificacion,
                cl.nombre_completo,
                lm.periodo,
                lm.saldo_inicial_capital,
                lm.capital_pagado,
                lm.intereses_corrientes_causados,
                lm.intereses_mora_causados,
                lm.dias_mora
            FROM liquidaciones_mensuales lm
            JOIN creditos c ON lm.credito_id = c.credito_id
            JOIN clientes cl ON c.cliente_id = cl.cliente_id
            WHERE lm.periodo = (CURRENT_DATE - INTERVAL '1 month')::DATE
            ORDER BY c.numero_credito
        ) TO '/tmp/liquidaciones_mes.csv' WITH CSV HEADER;
    """,
    dag=dag
)

# Definir orden de ejecución
causar_liquidaciones >> verificar_cuadratura >> enviar_reporte
```

---

## Mejores Prácticas de Fintech

### 1. Event Sourcing

**Principio**: Cada cambio en el estado de un crédito se registra como un evento inmutable.

**Beneficios**:
- Reconstrucción del estado del crédito en cualquier momento
- Auditoría completa
- Debugging facilitado
- Cumplimiento regulatorio

**Implementación**:
```sql
-- Nunca hacer esto
UPDATE creditos SET saldo_capital = 450000 WHERE credito_id = 123;

-- Siempre hacer esto
INSERT INTO transacciones (credito_id, tipo_transaccion, monto, ...)
VALUES (123, 'pago_capital', 50000, ...);

UPDATE creditos SET saldo_capital = saldo_capital - 50000 WHERE credito_id = 123;
```

### 2. Inmutabilidad de Transacciones

**Regla de oro**: Las transacciones financieras nunca se eliminan ni se modifican.

**Para correcciones**:
```sql
-- Transacción original (errónea)
INSERT INTO transacciones (credito_id, tipo_transaccion, monto, referencia_pago)
VALUES (123, 'pago_capital', 100000, 'REF-001');

-- Reverso (NO hacer DELETE ni UPDATE)
INSERT INTO transacciones (credito_id, tipo_transaccion, monto, referencia_pago, concepto)
VALUES (123, 'reverso', -100000, 'REF-001', 'Reverso de pago duplicado');

-- Transacción correcta
INSERT INTO transacciones (credito_id, tipo_transaccion, monto, referencia_pago)
VALUES (123, 'pago_capital', 50000, 'REF-001-CORR');
```

### 3. Conciliación Diaria Automática

```sql
-- Stored procedure de conciliación
CREATE OR REPLACE FUNCTION conciliar_saldos_diarios()
RETURNS TABLE(creditos_ok INTEGER, creditos_descuadrados INTEGER, diferencia_total NUMERIC) AS $$
DECLARE
    v_ok INTEGER := 0;
    v_descuadrados INTEGER := 0;
    v_diferencia NUMERIC := 0;
    descuadre RECORD;
BEGIN
    -- Detectar descuadres
    FOR descuadre IN
        SELECT 
            c.credito_id,
            c.numero_credito,
            c.saldo_capital as saldo_sistema,
            COALESCE(
                SUM(CASE 
                    WHEN t.tipo_transaccion = 'desembolso' THEN t.monto
                    WHEN t.tipo_transaccion = 'pago_capital' THEN -t.monto
                    ELSE 0
                END), 0
            ) as saldo_transacciones,
            ABS(
                c.saldo_capital - 
                COALESCE(
                    SUM(CASE 
                        WHEN t.tipo_transaccion = 'desembolso' THEN t.monto
                        WHEN t.tipo_transaccion = 'pago_capital' THEN -t.monto
                        ELSE 0
                    END), 0
                )
            ) as diferencia
        FROM creditos c
        LEFT JOIN transacciones t ON c.credito_id = t.credito_id
        WHERE c.estado IN ('vigente', 'desembolsado')
        GROUP BY c.credito_id, c.numero_credito, c.saldo_capital
        HAVING ABS(
            c.saldo_capital - 
            COALESCE(
                SUM(CASE 
                    WHEN t.tipo_transaccion = 'desembolso' THEN t.monto
                    WHEN t.tipo_transaccion = 'pago_capital' THEN -t.monto
                    ELSE 0
                END), 0
            )
        ) > 0.01
    LOOP
        v_descuadrados := v_descuadrados + 1;
        v_diferencia := v_diferencia + descuadre.diferencia;
        
        -- Log del descuadre
        RAISE WARNING 'Descuadre en crédito %: Sistema=% vs Transacciones=% (Diff=%)',
            descuadre.numero_credito,
            descuadre.saldo_sistema,
            descuadre.saldo_transacciones,
            descuadre.diferencia;
        
        -- Insertar en tabla de alertas
        INSERT INTO alertas_sistema (tipo, severidad, mensaje, datos)
        VALUES (
            'descuadre_contable',
            'CRITICO',
            'Descuadre detectado en crédito ' || descuadre.numero_credito,
            jsonb_build_object(
                'credito_id', descuadre.credito_id,
                'saldo_sistema', descuadre.saldo_sistema,
                'saldo_transacciones', descuadre.saldo_transacciones,
                'diferencia', descuadre.diferencia
            )
        );
    END LOOP;
    
    -- Contar créditos OK
    SELECT COUNT(*) INTO v_ok 
    FROM creditos 
    WHERE estado IN ('vigente', 'desembolsado');
    
    v_ok := v_ok - v_descuadrados;
    
    RETURN QUERY SELECT v_ok, v_descuadrados, v_diferencia;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar diariamente
SELECT * FROM conciliar_saldos_diarios();
```

### 4. Separación de Esquemas

```sql
-- Crear esquemas separados
CREATE SCHEMA core;        -- Datos transaccionales
CREATE SCHEMA reporting;   -- Datos para reportes
CREATE SCHEMA audit;       -- Auditoría y logs
CREATE SCHEMA staging;     -- Datos temporales/ETL

-- Mover tablas a esquemas
ALTER TABLE clientes SET SCHEMA core;
ALTER TABLE creditos SET SCHEMA core;
ALTER TABLE transacciones SET SCHEMA core;
ALTER TABLE plan_pagos SET SCHEMA core;

ALTER TABLE liquidaciones_mensuales SET SCHEMA reporting;
ALTER TABLE auditoria SET SCHEMA audit;

-- Permisos granulares
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO rol_analista;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA core TO rol_operador;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO rol_admin;
```

### 5. Cifrado de Datos Sensibles

```sql
-- Extensión para cifrado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla clientes con datos cifrados
ALTER TABLE clientes ADD COLUMN numero_cuenta_enc BYTEA;

-- Cifrar al insertar
INSERT INTO clientes (nombre_completo, identificacion, numero_cuenta_enc)
VALUES (
    'Juan Pérez',
    '1234567890',
    pgp_sym_encrypt('1234567890123456', 'clave_secreta_super_segura')
);

-- Descifrar al consultar (solo usuarios autorizados)
SELECT 
    nombre_completo,
    identificacion,
    pgp_sym_decrypt(numero_cuenta_enc, 'clave_secreta_super_segura') as numero_cuenta
FROM clientes
WHERE cliente_id = 123;
```

### 6. Idempotencia en Pagos

Para evitar pagos duplicados:

```sql
CREATE UNIQUE INDEX idx_transacciones_idempotencia 
ON transacciones(credito_id, referencia_pago, tipo_transaccion)
WHERE tipo_transaccion LIKE 'pago_%';

-- Al intentar registrar pago duplicado, PostgreSQL lanzará error de constraint
-- La aplicación debe manejar este error y retornar éxito (pago ya procesado)
```

### 7. Soft Deletes

Nunca eliminar registros, marcarlos como inactivos:

```sql
ALTER TABLE clientes ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE creditos ADD COLUMN deleted_at TIMESTAMP;

-- En lugar de DELETE
UPDATE clientes SET deleted_at = NOW() WHERE cliente_id = 123;

-- Queries siempre filtran por deleted_at
SELECT * FROM clientes WHERE deleted_at IS NULL;

-- Crear vista para facilitar
CREATE VIEW clientes_activos AS
SELECT * FROM clientes WHERE deleted_at IS NULL;
```

---

## Estrategia de Backups y Recuperación

### Política de Backups

#### Backups Continuos (PITR - Point In Time Recovery)
```bash
# En PostgreSQL configurar WAL archiving
archive_mode = on
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'
wal_level = replica
```

#### Backups Completos
- **Diarios**: Full backup a las 2 AM
- **Retención**: 30 días en disco, 1 año en S3/Cloud Storage
- **Pruebas de restauración**: Mensual

```bash
# Script de backup
#!/bin/bash
FECHA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"

pg_dump -h localhost -U postgres -Fc fintech_db > $BACKUP_DIR/fintech_$FECHA.dump

# Upload a S3
aws s3 cp $BACKUP_DIR/fintech_$FECHA.dump s3://fintech-backups/daily/

# Limpiar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 1 hora
**RPO (Recovery Point Objective)**: 15 minutos

**Estrategia**:
1. Réplicas en múltiples zonas de disponibilidad
2. Failover automático con Patroni/pg_auto_failover
3. Backups cada 15 minutos de WAL logs
4. Pruebas trimestrales de recuperación completa

---

## Índices Optimizados

### Índices Esenciales

```sql
-- Clientes
CREATE INDEX idx_clientes_identificacion ON clientes(identificacion);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_estado ON clientes(estado) WHERE estado = 'activo';

-- Créditos
CREATE INDEX idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX idx_creditos_numero ON creditos(numero_credito);
CREATE INDEX idx_creditos_estado ON creditos(estado);
CREATE INDEX idx_creditos_fecha_desembolso ON creditos(fecha_desembolso);
CREATE INDEX idx_creditos_activos ON creditos(estado) WHERE estado IN ('vigente', 'desembolsado');

-- Transacciones (crítico para performance)
CREATE INDEX idx_transacciones_credito_fecha ON transacciones(credito_id, fecha_aplicacion DESC);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo_transaccion);
CREATE INDEX idx_transacciones_referencia ON transacciones(referencia_pago);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_aplicacion);

-- Índice para búsqueda de pagos por rango de fechas
CREATE INDEX idx_transacciones_pagos ON transacciones(fecha_aplicacion, tipo_transaccion) 
WHERE tipo_transaccion LIKE 'pago_%';

-- Plan de pagos
CREATE INDEX idx_plan_pagos_credito ON plan_pagos(credito_id);
CREATE INDEX idx_plan_pagos_vencimiento ON plan_pagos(fecha_vencimiento);
CREATE INDEX idx_plan_pagos_vencidas ON plan_pagos(estado) WHERE estado = 'vencida';

-- Liquidaciones
CREATE INDEX idx_liquidaciones_credito_periodo ON liquidaciones_mensuales(credito_id, periodo DESC);
CREATE INDEX idx_liquidaciones_periodo ON liquidaciones_mensuales(periodo);

-- Índices para reportes de cartera
CREATE INDEX idx_creditos_cartera ON creditos(estado, fecha_desembolso, saldo_capital);
```

### Índices Compuestos para Queries Frecuentes

```sql
-- Para reporte de vencimientos del día
CREATE INDEX idx_plan_pagos_vencimientos_dia 
ON plan_pagos(fecha_vencimiento, estado) 
WHERE estado IN ('pendiente', 'vencida');

-- Para dashboard de mora
CREATE INDEX idx_creditos_mora 
ON creditos(estado, saldo_mora) 
WHERE saldo_mora > 0;

-- Para búsqueda de transacciones de un cliente
CREATE INDEX idx_transacciones_cliente 
ON transacciones(credito_id) 
INCLUDE (fecha_aplicacion, tipo_transaccion, monto);
```

---

## Consideraciones de Escalabilidad

### Escenarios de Volumen

**Actual**: Miles de clientes
**Proyección 3 años**: Decenas de miles
**Proyección 5 años**: Cientos de miles

### Estrategias de Escalamiento

#### 1. Escalamiento Vertical (Scale Up)
- Incrementar CPU, RAM, IOPS del servidor principal
- Hasta cierto punto es la solución más simple
- Límite técnico y económico

#### 2. Escalamiento Horizontal (Scale Out)

**Read Replicas**:
```
Primary (Write) → Replica 1 (Read)
                → Replica 2 (Read)
                → Replica 3 (Read - Analytics)
```

**Sharding por cliente** (solo si superan 1M de clientes):
```sql
-- Shard 1: clientes con identificacion terminada en 0-4
-- Shard 2: clientes con identificacion terminada en 5-9

CREATE TABLE clientes_shard_1 (...) INHERITS (clientes);
CREATE TABLE clientes_shard_2 (...) INHERITS (clientes);
```

#### 3. Caché con Redis

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_saldo_credito(credito_id):
    # Intentar obtener de cache
    cache_key = f"credito:{credito_id}:saldo"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Si no está en cache, consultar DB
    saldo = db.query("""
        SELECT saldo_capital, saldo_intereses, saldo_mora 
        FROM creditos 
        WHERE credito_id = %s
    """, (credito_id,))
    
    # Guardar en cache por 5 minutos
    redis_client.setex(cache_key, 300, json.dumps(saldo))
    
    return saldo
```

#### 4. Connection Pooling

```python
# Ejemplo con SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    'postgresql://user:password@localhost/fintech_db',
    poolclass=QueuePool,
    pool_size=20,        # Conexiones activas
    max_overflow=10,     # Conexiones adicionales en picos
    pool_timeout=30,     # Timeout para obtener conexión
    pool_recycle=3600    # Reciclar conexiones cada hora
)
```

### Monitoreo de Performance

**Métricas clave a monitorear**:
- Queries lentas (> 1 segundo)
- Tasa de cache hits
- Conexiones activas / máximo
- Locks y deadlocks
- Tamaño de tablas y índices
- IOPS y latencia de disco

```sql
-- Query para identificar queries lentas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- Mayor a 1 segundo
ORDER BY mean_time DESC
LIMIT 20;

-- Tamaño de tablas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Stack Tecnológico Recomendado

### Base de Datos
- **Principal**: PostgreSQL 15+ (con extensiones pgcrypto, pg_stat_statements)
- **Cache**: Redis 7+
- **Data Warehouse**: Snowflake / Amazon Redshift / Google BigQuery
- **Message Queue**: RabbitMQ / Apache Kafka / AWS SQS

### Backend
**Opción 1 - Python**:
- Framework: FastAPI / Django Rest Framework
- ORM: SQLAlchemy
- Tareas asíncronas: Celery + Redis

**Opción 2 - Java**:
- Framework: Spring Boot
- ORM: Hibernate / JPA
- Tareas asíncronas: Spring Batch

**Opción 3 - Node.js**:
- Framework: NestJS / Express
- ORM: Prisma / TypeORM
- Tareas asíncronas: Bull Queue

### Orquestación y ETL
- **Apache Airflow**: Para jobs batch, liquidaciones, reportes
- **dbt (data build tool)**: Para transformaciones en Data Warehouse

### Monitoreo y Observabilidad
- **APM**: Datadog / New Relic / Dynatrace
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Métricas**: Prometheus + Grafana
- **Alertas**: PagerDuty / Opsgenie

### Infraestructura
- **Cloud**: AWS / Google Cloud / Azure
- **Contenedores**: Docker + Kubernetes
- **IaC**: Terraform / Pulumi
- **CI/CD**: GitHub Actions / GitLab CI / Jenkins

### Seguridad
- **Vault**: HashiCorp Vault para secretos
- **WAF**: Cloudflare / AWS WAF
- **Auditoría**: Cloud security posture management (CSPM)

---

## Cumplimiento Regulatorio

### Regulaciones Financieras (Colombia ejemplo)

1. **Superintendencia Financiera**
   - Reportes mensuales de cartera
   - Clasificación de riesgo (A, B, C, D, E)
   - Provisiones según días de mora

2. **Habeas Data**
   - Consentimiento explícito del cliente
   - Derecho a rectificación y eliminación
   - Log de accesos a datos personales

3. **Prevención de Lavado de Activos (SARLAFT)**
   - Identificación y conocimiento del cliente (KYC)
   - Monitoreo de transacciones inusuales
   - Reportes de operaciones sospechosas (ROS)

### Tablas para Compliance

```sql
-- Consentimientos de datos personales
CREATE TABLE consentimientos_datos (
    consentimiento_id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(cliente_id),
    tipo_consentimiento VARCHAR(50), -- habeas_data, marketing, compartir_terceros
    otorgado BOOLEAN DEFAULT FALSE,
    fecha_otorgamiento TIMESTAMP,
    fecha_revocacion TIMESTAMP,
    ip_otorgamiento VARCHAR(45),
    evidencia JSONB -- Puede guardar screenshot, texto firmado, etc.
);

-- Clasificación de riesgo crediticio
CREATE TABLE clasificacion_riesgo (
    clasificacion_id BIGSERIAL PRIMARY KEY,
    credito_id BIGINT REFERENCES creditos(credito_id),
    fecha_clasificacion DATE NOT NULL,
    categoria VARCHAR(1), -- A, B, C, D, E
    dias_mora INTEGER,
    provision_requerida NUMERIC(15,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoreo transaccional (SARLAFT)
CREATE TABLE alertas_sarlaft (
    alerta_id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(cliente_id),
    tipo_alerta VARCHAR(50), -- transaccion_inusual, perfil_alto_riesgo, pep
    descripcion TEXT,
    severidad VARCHAR(20), -- baja, media, alta, critica
    estado VARCHAR(30), -- abierta, en_revision, cerrada, reportada
    fecha_deteccion TIMESTAMP DEFAULT NOW(),
    fecha_resolucion TIMESTAMP,
    usuario_revisor VARCHAR(100),
    acciones_tomadas TEXT
);
```

---

## Consultas Útiles

### Reporte de Cartera Actual

```sql
SELECT 
    c.estado,
    COUNT(*) as num_creditos,
    SUM(c.saldo_capital) as saldo_capital_total,
    SUM(c.saldo_intereses) as saldo_intereses_total,
    SUM(c.saldo_mora) as saldo_mora_total,
    SUM(c.saldo_capital + c.saldo_intereses + c.saldo_mora) as cartera_total,
    AVG(c.saldo_capital) as promedio_credito
FROM creditos c
WHERE c.estado IN ('vigente', 'desembolsado')
GROUP BY c.estado
ORDER BY c.estado;
```

### Créditos en Mora

```sql
SELECT 
    c.numero_credito,
    cl.identificacion,
    cl.nombre_completo,
    c.saldo_capital,
    c.saldo_mora,
    pp.fecha_vencimiento as primera_cuota_vencida,
    CURRENT_DATE - pp.fecha_vencimiento as dias_mora,
    CASE 
        WHEN CURRENT_DATE - pp.fecha_vencimiento <= 30 THEN 'Mora temprana (1-30)'
        WHEN CURRENT_DATE - pp.fecha_vencimiento <= 90 THEN 'Mora media (31-90)'
        WHEN CURRENT_DATE - pp.fecha_vencimiento <= 180 THEN 'Mora alta (91-180)'
        ELSE 'Mora crítica (>180)'
    END as categoria_mora
FROM creditos c
JOIN clientes cl ON c.cliente_id = cl.cliente_id
JOIN LATERAL (
    SELECT MIN(fecha_vencimiento) as fecha_vencimiento
    FROM plan_pagos pp2
    WHERE pp2.credito_id = c.credito_id 
    AND pp2.estado = 'vencida'
) pp ON true
WHERE c.estado = 'vigente'
AND c.saldo_mora > 0
ORDER BY dias_mora DESC;
```

### Liquidación Mensual de un Crédito

```sql
SELECT 
    lm.periodo,
    lm.saldo_inicial_capital,
    lm.capital_pagado,
    lm.intereses_corrientes_causados,
    lm.intereses_corrientes_pagados,
    lm.intereses_mora_causados,
    lm.intereses_mora_pagados,
    lm.servicios_legales,
    lm.saldo_final_capital,
    lm.dias_mora
FROM liquidaciones_mensuales lm
WHERE lm.credito_id = 123
ORDER BY lm.periodo DESC
LIMIT 12; -- Últimos 12 meses
```

### Top 10 Clientes por Saldo

```sql
SELECT 
    cl.identificacion,
    cl.nombre_completo,
    COUNT(c.credito_id) as num_creditos,
    SUM(c.saldo_capital) as saldo_total,
    MAX(c.fecha_desembolso) as ultimo_desembolso,
    AVG(c.tasa_interes) as tasa_promedio
FROM clientes cl
JOIN creditos c ON cl.cliente_id = c.cliente_id
WHERE c.estado IN ('vigente', 'desembolsado')
GROUP BY cl.cliente_id, cl.identificacion, cl.nombre_completo
ORDER BY saldo_total DESC
LIMIT 10;
```

### Indicadores de Calidad de Cartera

```sql
WITH cartera_total AS (
    SELECT 
        SUM(saldo_capital) as total_cartera,
        SUM(CASE WHEN saldo_mora > 0 THEN saldo_capital ELSE 0 END) as cartera_vencida,
        COUNT(*) as total_creditos,
        COUNT(CASE WHEN saldo_mora > 0 THEN 1 END) as creditos_mora
    FROM creditos
    WHERE estado = 'vigente'
)
SELECT 
    total_cartera,
    cartera_vencida,
    total_creditos,
    creditos_mora,
    ROUND((cartera_vencida / NULLIF(total_cartera, 0) * 100)::NUMERIC, 2) as porcentaje_cartera_vencida,
    ROUND((creditos_mora::NUMERIC / NULLIF(total_creditos, 0) * 100)::NUMERIC, 2) as porcentaje_creditos_mora
FROM cartera_total;
```

---

## Diagrama Entidad-Relación

```
┌─────────────────┐
│    CLIENTES     │
│─────────────────│
│ cliente_id (PK) │
│ identificacion  │
│ nombre_completo │
│ email           │
│ telefono        │
│ estado          │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│    CREDITOS     │
│─────────────────│
│ credito_id (PK) │
│ cliente_id (FK) │
│ numero_credito  │
│ monto_aprobado  │
│ tasa_interes    │
│ saldo_capital   │
│ saldo_intereses │
│ saldo_mora      │
│ estado          │
└────────┬────────┘
         │
         ├──────────────┬─────────────┬──────────────┐
         │ 1:N          │ 1:N         │ 1:N          │
         │              │             │              │
┌────────▼────────┐  ┌──▼──────────┐ ┌▼─────────────┐
│   PLAN_PAGOS    │  │TRANSACCIONES│ │LIQUIDACIONES │
│─────────────────│  │─────────────│ │  _MENSUALES  │
│plan_pago_id (PK)│  │transaccion_ │ │liquidacion_  │
│credito_id (FK)  │  │   id (PK)   │ │  id (PK)     │
│numero_cuota     │  │credito_id   │ │credito_id    │
│fecha_vencimiento│  │   (FK)      │ │   (FK)       │
│valor_cuota      │  │tipo_trans.  │ │periodo       │
│capital          │  │monto        │ │capital_      │
│intereses        │  │fecha_aplic. │ │  pagado      │
│estado           │  │referencia   │ │intereses_    │
└─────────────────┘  └─────────────┘ │  causados    │
                                      └──────────────┘
```

---

## Checklist de Implementación

### Fase 1: Setup Inicial (Semana 1-2)
- [ ] Instalar PostgreSQL 15+
- [ ] Configurar réplicas de lectura
- [ ] Crear estructura de tablas
- [ ] Configurar backups automáticos
- [ ] Implementar triggers de auditoría
- [ ] Crear índices esenciales

### Fase 2: Lógica de Negocio (Semana 3-4)
- [ ] Implementar funciones de liquidación
- [ ] Crear procedimientos de aplicación de pagos
- [ ] Desarrollar proceso de causación mensual
- [ ] Implementar conciliación diaria
- [ ] Crear reportes básicos

### Fase 3: Seguridad y Compliance (Semana 5-6)
- [ ] Configurar cifrado de datos sensibles
- [ ] Implementar autenticación y autorización
- [ ] Crear logs de acceso
- [ ] Desarrollar módulo de consentimientos
- [ ] Implementar alertas SARLAFT

### Fase 4: Escalabilidad (Semana 7-8)
- [ ] Configurar cache Redis
- [ ] Implementar particionamiento
- [ ] Optimizar queries lentas
- [ ] Configurar connection pooling
- [ ] Setup de monitoreo

### Fase 5: Testing y Go-Live (Semana 9-10)
- [ ] Pruebas de carga
- [ ] Pruebas de recuperación ante desastres
- [ ] Validación de reportes regulatorios
- [ ] Capacitación del equipo
- [ ] Migración de datos (si aplica)
- [ ] Go-live y monitoreo intensivo

---

## Recursos Adicionales

### Documentación Oficial
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation
- Apache Airflow: https://airflow.apache.org/docs/

### Libros Recomendados
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Database Internals" - Alex Petrov
- "PostgreSQL: Up and Running" - Regina Obe

### Comunidades
- Stack Overflow (tag: postgresql, fintech)
- PostgreSQL Slack community
- Reddit: r/PostgreSQL, r/fintech

---

## Conclusiones

**Puntos Clave**:

1. **Nunca crear una tabla por crédito**: Usar una tabla `creditos` para todos los créditos
2. **Event sourcing**: Registrar cada cambio como transacción inmutable
3. **Particionamiento**: Para manejar 5 años de datos eficientemente
4. **Separación OLTP/OLAP**: Base transaccional + Data Warehouse para analytics
5. **Auditoría total**: Triggers automáticos para trazabilidad completa
6. **Conciliación diaria**: Verificar integridad de saldos automáticamente
7. **Backups robustos**: PITR + backups diarios con pruebas de recuperación

**Arquitectura Recomendada**:
- PostgreSQL como base principal
- Redis para caché
- Réplicas de lectura para distribuir carga
- Data Warehouse para reportería histórica
- Particionamiento para datos de 5+ años
- Apache Airflow para procesos batch

Esta arquitectura te permitirá escalar desde miles hasta millones de clientes manteniendo la integridad de datos, cumplimiento regulatorio y performance óptimo.
