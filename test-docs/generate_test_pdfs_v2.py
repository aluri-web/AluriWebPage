"""
Genera PDFs de prueba v2 — persona diferente para segunda evaluación.
Solicitante: María Elena Rodríguez Gómez, CC 52.345.678
Inmueble: Casa en Medellín, Matrícula 020-567890
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

OUT = os.path.dirname(os.path.abspath(__file__))
PREFIX = "v2_"


def make_pdf(filename: str, lines: list[str]):
    path = os.path.join(OUT, f"{PREFIX}{filename}")
    c = canvas.Canvas(path, pagesize=letter)
    w, h = letter
    y = h - 50
    for line in lines:
        if y < 60:
            c.showPage()
            y = h - 50
        if line.startswith("##"):
            c.setFont("Helvetica-Bold", 14)
            line = line.replace("## ", "")
        elif line.startswith("#"):
            c.setFont("Helvetica-Bold", 18)
            line = line.replace("# ", "")
        else:
            c.setFont("Helvetica", 10)
        c.drawString(50, y, line)
        y -= 18
    c.save()
    print(f"  -> {path}")


# ── 1. Certificado de Libertad y Tradición ──
make_pdf("01_libertad_tradicion.pdf", [
    "# CERTIFICADO DE LIBERTAD Y TRADICIÓN",
    "",
    "## Oficina de Registro de Instrumentos Públicos de Medellín",
    f"Fecha de expedición: 10 de marzo de 2026",
    "",
    "## Información del Inmueble",
    "Matrícula inmobiliaria: 020-567890",
    "CHIP: AAA0234MNOP",
    "Dirección: Carrera 43A # 14-109, Casa 12, Medellín, Antioquia",
    "Tipo de inmueble: Casa",
    "Área construida: 180 m²",
    "Área del terreno: 220 m²",
    "Destino económico: Habitacional",
    "Estrato: 5",
    "",
    "## Titulares de Dominio",
    "Propietaria: MARÍA ELENA RODRÍGUEZ GÓMEZ",
    "Identificación: C.C. 52.345.678",
    "Porcentaje: 100%",
    "",
    "## Tradición (Últimos 20 años)",
    "",
    "Anotación 001 - 2008-06-15",
    "  Tipo: Compraventa",
    "  De: BANCO CONSTRUCTOR S.A. (NIT 800.123.456-7)",
    "  A: PEDRO JOSÉ HERNÁNDEZ VILLA (CC 71.234.567)",
    "  Escritura: 2345 de Notaría 8 de Medellín",
    "",
    "Anotación 002 - 2015-03-22",
    "  Tipo: Compraventa",
    "  De: PEDRO JOSÉ HERNÁNDEZ VILLA (CC 71.234.567)",
    "  A: MARÍA ELENA RODRÍGUEZ GÓMEZ (CC 52.345.678)",
    "  Escritura: 1567 de Notaría 15 de Medellín",
    "  Valor de la transacción: $420.000.000 COP",
    "",
    "## Gravámenes y Limitaciones",
    "Sin gravámenes vigentes.",
    "Sin embargos.",
    "Sin condiciones resolutorias.",
    "",
    "## Estado del Folio",
    "Estado: ACTIVO",
    "El presente certificado se expide sin limitaciones al dominio.",
])

# ── 2. Escritura Pública ──
make_pdf("02_escritura.pdf", [
    "# ESCRITURA PÚBLICA No. 1567",
    "",
    "## Notaría Quince (15) del Círculo de Medellín",
    "Fecha: 22 de marzo de 2015",
    "",
    "## COMPARECIENTES",
    "",
    "VENDEDOR: PEDRO JOSÉ HERNÁNDEZ VILLA",
    "  C.C. 71.234.567 expedida en Medellín",
    "  Estado civil: Casado",
    "",
    "COMPRADORA: MARÍA ELENA RODRÍGUEZ GÓMEZ",
    "  C.C. 52.345.678 expedida en Bogotá D.C.",
    "  Estado civil: Soltera",
    "",
    "## OBJETO DEL CONTRATO",
    "Compraventa del inmueble ubicado en:",
    "Carrera 43A # 14-109, Casa 12, Medellín, Antioquia",
    "Matrícula Inmobiliaria: 020-567890",
    "",
    "## PRECIO Y FORMA DE PAGO",
    "Precio total: CUATROCIENTOS VEINTE MILLONES DE PESOS ($420.000.000 COP)",
    "Forma de pago: Contado — transferencia bancaria",
    "",
    "## LINDEROS",
    "NORTE: Calle 14 Sur en 12.50 metros",
    "SUR: Propiedad de Juan Carlos Mejía en 12.50 metros",
    "ORIENTE: Carrera 43A en 17.60 metros",
    "OCCIDENTE: Propiedad de Consorcio El Poblado en 17.60 metros",
    "",
    "## DECLARACIONES",
    "El vendedor declara:",
    "- Ser propietario legítimo del inmueble",
    "- El inmueble se encuentra libre de gravámenes y embargos",
    "- No existen procesos judiciales pendientes",
    "",
    "La compradora declara:",
    "- Conocer el estado material y jurídico del inmueble",
    "- Aceptar la compra en las condiciones descritas",
    "",
    "## FIRMAS",
    "Pedro José Hernández Villa - Vendedor",
    "María Elena Rodríguez Gómez - Compradora",
    "Dr. Andrés Felipe Montoya C. - Notario Quince de Medellín",
])

# ── 3. Cédula de Ciudadanía ──
make_pdf("03_cedula.pdf", [
    "# REPÚBLICA DE COLOMBIA",
    "## CÉDULA DE CIUDADANÍA",
    "",
    "Número: 52.345.678",
    "Apellidos: RODRÍGUEZ GÓMEZ",
    "Nombres: MARÍA ELENA",
    "",
    "Fecha de nacimiento: 15 de noviembre de 1982",
    "Lugar de nacimiento: Bogotá D.C.",
    "Sexo: Femenino",
    "Tipo de sangre: O+",
    "Estatura: 1.65 m",
    "",
    "Fecha de expedición: 03 de febrero de 2001",
    "Lugar de expedición: Bogotá D.C.",
    "",
    "Firma del titular: María Elena Rodríguez Gómez",
    "Huella dactilar: [REGISTRADA]",
])

# ── 4. Extractos bancarios (3 meses) ──
for i, (mes, saldo_ini, ingresos, gastos) in enumerate([
    ("Diciembre 2025", "45.200.000", "18.500.000", "14.800.000"),
    ("Enero 2026",     "48.900.000", "19.200.000", "15.100.000"),
    ("Febrero 2026",   "53.000.000", "18.800.000", "13.500.000"),
], start=1):
    make_pdf(f"04_extracto_{i}.pdf", [
        "# EXTRACTO BANCARIO",
        f"## Bancolombia S.A. — Cuenta de Ahorros No. 2345-6789-0123",
        "",
        f"Titular: MARÍA ELENA RODRÍGUEZ GÓMEZ",
        f"C.C. 52.345.678",
        f"Período: {mes}",
        "",
        f"Saldo inicial: ${saldo_ini} COP",
        "",
        "## Movimientos principales:",
        f"  Nómina Empresa XYZ S.A.S.:      $15.200.000 COP",
        f"  Honorarios consultoría:           $3.300.000 COP" if i != 2 else f"  Honorarios consultoría:           $4.000.000 COP",
        f"  Arriendo local comercial:         $0 COP",
        f"  Pago tarjeta de crédito:         -$4.500.000 COP",
        f"  Servicios públicos:              -$850.000 COP",
        f"  Mercado y varios:                -$2.200.000 COP",
        f"  Seguro médico prepagada:         -$1.100.000 COP",
        f"  Cuota vehículo:                  -$2.800.000 COP",
        "",
        f"Total ingresos del mes: ${ingresos} COP",
        f"Total egresos del mes: ${gastos} COP",
        f"Saldo final: ${saldo_ini.replace(saldo_ini[0:2], str(int(saldo_ini[0:2])+3))} COP",
        "",
        "Promedio últimos 6 meses: $48.500.000 COP",
    ])

# ── 5. Certificado de ingresos ──
make_pdf("05_certificado_ingresos.pdf", [
    "# CERTIFICADO DE INGRESOS Y RETENCIONES",
    "## Empresa XYZ S.A.S.",
    "NIT: 901.234.567-8",
    "",
    "Fecha: 01 de marzo de 2026",
    "",
    "## Datos del Empleado",
    "Nombre: MARÍA ELENA RODRÍGUEZ GÓMEZ",
    "C.C.: 52.345.678",
    "Cargo: Directora de Proyectos",
    "Fecha de ingreso: 15 de agosto de 2018",
    "Tipo de contrato: Indefinido",
    "",
    "## Ingresos Año 2025",
    "Salario mensual básico:           $15.200.000 COP",
    "Salario anual:                    $182.400.000 COP",
    "Bonificaciones anuales:           $22.800.000 COP",
    "Prima de servicios:               $15.200.000 COP",
    "Total ingresos brutos anuales:    $220.400.000 COP",
    "",
    "## Retenciones",
    "Retención en la fuente:           $26.448.000 COP",
    "Aportes salud (empleado):         $7.296.000 COP",
    "Aportes pensión (empleado):       $7.296.000 COP",
    "",
    "Ingreso neto mensual promedio:    $14.947.000 COP",
    "",
    "## Certificación",
    "Se expide el presente certificado para los fines que el",
    "interesado considere pertinentes.",
    "",
    "Firma: Carlos Alberto Mejía R.",
    "Cargo: Director de Recursos Humanos",
])

# ── 6. Declaración de renta ──
make_pdf("06_declaracion_renta.pdf", [
    "# DECLARACIÓN DE RENTA - AÑO GRAVABLE 2024",
    "## DIAN — Formulario 210",
    "",
    "Contribuyente: MARÍA ELENA RODRÍGUEZ GÓMEZ",
    "NIT/CC: 52.345.678",
    "Actividad económica: 7020 - Actividades de consultoría de gestión",
    "",
    "## PATRIMONIO",
    "Total patrimonio bruto:           $890.000.000 COP",
    "Total deudas:                     $185.000.000 COP",
    "Total patrimonio líquido:         $705.000.000 COP",
    "",
    "## Composición del patrimonio:",
    "Inmueble Medellín (Cra 43A):      $550.000.000 COP",
    "Vehículo Mazda CX-5 2022:         $95.000.000 COP",
    "Cuentas bancarias:                 $53.000.000 COP",
    "Inversiones CDT/Fondos:            $142.000.000 COP",
    "Otros activos:                     $50.000.000 COP",
    "",
    "## INGRESOS",
    "Ingresos por salarios:            $182.400.000 COP",
    "Ingresos por honorarios:           $39.600.000 COP",
    "Rendimientos financieros:          $8.520.000 COP",
    "Total ingresos brutos:            $230.520.000 COP",
    "",
    "## DEDUCCIONES Y RENTAS EXENTAS",
    "Aportes obligatorios pensión:      $14.592.000 COP",
    "Aportes voluntarios pensión:       $12.000.000 COP",
    "Intereses vivienda:                $0 COP",
    "Dependientes:                      $0 COP",
    "Renta exenta 25%:                  $45.630.000 COP",
    "",
    "## LIQUIDACIÓN",
    "Renta líquida gravable:           $158.298.000 COP",
    "Impuesto sobre la renta:           $33.860.000 COP",
    "Retenciones practicadas:           $26.448.000 COP",
    "Saldo a pagar:                     $7.412.000 COP",
])

# ── 7. Reporte AUCO ──
make_pdf("07_reporte_auco.pdf", [
    "# REPORTE DE VERIFICACIÓN AUCO",
    "## Plataforma de Verificación de Antecedentes",
    "",
    "Fecha de consulta: 10 de marzo de 2026",
    "Solicitado por: ALURI S.A.S.",
    "",
    "## PERSONA CONSULTADA",
    "Nombre: MARÍA ELENA RODRÍGUEZ GÓMEZ",
    "Documento: C.C. 52.345.678",
    "",
    "## 1. ANTECEDENTES JUDICIALES",
    "Procuraduría General de la Nación: SIN ANTECEDENTES",
    "Contraloría General de la República: SIN ANTECEDENTES",
    "Policía Nacional (SIJIN): SIN ANTECEDENTES",
    "Rama Judicial (consulta de procesos): SIN PROCESOS ACTIVOS",
    "",
    "## 2. LISTAS RESTRICTIVAS",
    "Lista Clinton (OFAC/SDN): NO REPORTADA",
    "Lista ONU: NO REPORTADA",
    "Lista UE: NO REPORTADA",
    "SARLAFT (Superfinanciera): SIN REPORTES",
    "PEPs (Personas Expuestas Políticamente): NO",
    "",
    "## 3. SEGURIDAD SOCIAL",
    "Estado afiliación salud: ACTIVA (EPS Sura)",
    "Estado afiliación pensión: ACTIVA (Protección S.A.)",
    "Estado ARL: ACTIVA (Sura ARL)",
    "Empleador reportado: EMPRESA XYZ S.A.S.",
    "",
    "## 4. INFORMACIÓN CREDITICIA (DataCrédito)",
    "Score: 920 / 1000 (Excelente)",
    "Obligaciones vigentes: 2",
    "  - Crédito vehículo Bancolombia: $45.000.000 (al día)",
    "  - Tarjeta Visa Bancolombia: Cupo $20.000.000 (al día)",
    "Obligaciones en mora: 0",
    "Hábito de pago: Excelente — sin moras en últimos 24 meses",
    "",
    "## RESULTADO",
    "Riesgo AUCO: BAJO",
    "Coincidencias en listas: 0/0",
    "Verificación completada satisfactoriamente.",
])

print("\n¡PDFs v2 generados!")
