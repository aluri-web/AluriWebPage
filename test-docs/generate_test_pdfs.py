"""Generate realistic test PDFs for Aluri AI agent evaluation pipeline."""
from fpdf import FPDF
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Shared helpers ──

def new_pdf(title: str) -> FPDF:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, title, ln=True, align="C")
    pdf.ln(6)
    return pdf

def section(pdf: FPDF, heading: str):
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, heading, ln=True)
    pdf.set_font("Helvetica", "", 10)

def line(pdf: FPDF, text: str):
    pdf.cell(0, 6, text, ln=True)

def save(pdf: FPDF, name: str):
    path = os.path.join(OUTPUT_DIR, name)
    pdf.output(path)
    print(f"  -> {path}")


# ═══════════════════════════════════════════════════════
# 1. Certificado de Libertad y Tradicion
# ═══════════════════════════════════════════════════════

def gen_libertad_tradicion():
    pdf = new_pdf("CERTIFICADO DE TRADICION Y LIBERTAD")

    section(pdf, "OFICINA DE REGISTRO DE INSTRUMENTOS PUBLICOS DE BOGOTA")
    line(pdf, "Zona Centro")
    line(pdf, f"Fecha de expedicion: 15 de febrero de 2026")
    line(pdf, f"Numero de Matricula Inmobiliaria: 50C-12345678")
    line(pdf, "")

    section(pdf, "DESCRIPCION DEL INMUEBLE")
    line(pdf, "Tipo: APARTAMENTO")
    line(pdf, "Direccion: Calle 85 # 12-45, Apto 501")
    line(pdf, "Ciudad: Bogota D.C.")
    line(pdf, "Barrio: Chico Norte")
    line(pdf, "Area construida: 120 m2")
    line(pdf, "Area privada: 95 m2")
    line(pdf, "Estrato: 5")
    line(pdf, "Linderos: Norte con apto 502, Sur con zona comun,")
    line(pdf, "  Este con fachada, Oeste con apto 503")
    line(pdf, "")

    section(pdf, "TITULARES DE DERECHO REAL DE DOMINIO")
    line(pdf, "Propietario actual: CARLOS ANDRES MARTINEZ LOPEZ")
    line(pdf, "Cedula de Ciudadania: 1.020.789.456")
    line(pdf, "Titulo: Compraventa")
    line(pdf, "Escritura Publica No. 2345 del 20 de marzo de 2019")
    line(pdf, "Notaria 45 de Bogota")
    line(pdf, "Fecha de Registro: 25 de marzo de 2019")
    line(pdf, "")

    section(pdf, "ANOTACIONES")
    line(pdf, "Anotacion 001 - 15/06/2015")
    line(pdf, "  Compraventa - Escritura 1890 Notaria 12 de Bogota")
    line(pdf, "  De: INVERSIONES URBANAS S.A.S. (NIT 900.456.789-1)")
    line(pdf, "  A: MARIA ELENA RODRIGUEZ GUTIERREZ (CC 51.890.234)")
    line(pdf, "")
    line(pdf, "Anotacion 002 - 20/03/2019")
    line(pdf, "  Compraventa - Escritura 2345 Notaria 45 de Bogota")
    line(pdf, "  De: MARIA ELENA RODRIGUEZ GUTIERREZ (CC 51.890.234)")
    line(pdf, "  A: CARLOS ANDRES MARTINEZ LOPEZ (CC 1.020.789.456)")
    line(pdf, "")
    line(pdf, "Anotacion 003 - 10/01/2020")
    line(pdf, "  Hipoteca abierta sin limite de cuantia")
    line(pdf, "  A favor de: BANCO DAVIVIENDA S.A. (NIT 860.034.313-7)")
    line(pdf, "  Escritura 0456 Notaria 45 de Bogota")
    line(pdf, "  NOTA: CANCELADA mediante Escritura 1234 del 05/08/2024")
    line(pdf, "")

    section(pdf, "ESTADO JURIDICO")
    line(pdf, "El inmueble se encuentra LIBRE DE GRAVAMENES Y LIMITACIONES")
    line(pdf, "No presenta embargos, demandas civiles ni condiciones resolutorias vigentes.")
    line(pdf, "")
    line(pdf, "Certificado valido por 30 dias a partir de la fecha de expedicion.")

    save(pdf, "01_libertad_tradicion.pdf")


# ═══════════════════════════════════════════════════════
# 2. Escritura Publica
# ═══════════════════════════════════════════════════════

def gen_escritura():
    pdf = new_pdf("ESCRITURA PUBLICA No. 2345")

    section(pdf, "NOTARIA CUARENTA Y CINCO (45) DE BOGOTA D.C.")
    line(pdf, "Fecha: 20 de marzo de 2019")
    line(pdf, "")

    section(pdf, "COMPARECIENTES")
    line(pdf, "VENDEDORA: MARIA ELENA RODRIGUEZ GUTIERREZ")
    line(pdf, "  Cedula de Ciudadania No. 51.890.234 de Bogota")
    line(pdf, "  Estado civil: Soltera")
    line(pdf, "")
    line(pdf, "COMPRADOR: CARLOS ANDRES MARTINEZ LOPEZ")
    line(pdf, "  Cedula de Ciudadania No. 1.020.789.456 de Bogota")
    line(pdf, "  Estado civil: Soltero")
    line(pdf, "")

    section(pdf, "OBJETO DEL CONTRATO")
    line(pdf, "Compraventa del inmueble identificado con Matricula Inmobiliaria")
    line(pdf, "50C-12345678, ubicado en la Calle 85 # 12-45, Apartamento 501,")
    line(pdf, "Barrio Chico Norte, Bogota D.C.")
    line(pdf, "")

    section(pdf, "PRECIO Y FORMA DE PAGO")
    line(pdf, "Precio total de la compraventa: $650.000.000 COP")
    line(pdf, "(Seiscientos cincuenta millones de pesos)")
    line(pdf, "Forma de pago:")
    line(pdf, "  - Cuota inicial: $200.000.000 COP (cheque de gerencia)")
    line(pdf, "  - Saldo: $450.000.000 COP (credito hipotecario Banco Davivienda)")
    line(pdf, "")

    section(pdf, "DECLARACIONES")
    line(pdf, "1. La vendedora declara ser propietaria unica del inmueble.")
    line(pdf, "2. El inmueble se encuentra libre de gravamenes, embargos y limitaciones.")
    line(pdf, "3. Se encuentra al dia en el pago de impuestos y administracion.")
    line(pdf, "4. El inmueble no se encuentra en zona de riesgo ni afectacion urbanistica.")
    line(pdf, "")

    section(pdf, "TRADICION")
    line(pdf, "El inmueble fue adquirido por la vendedora mediante Escritura Publica")
    line(pdf, "No. 1890 del 15 de junio de 2015, otorgada en la Notaria 12 de Bogota,")
    line(pdf, "registrada bajo la Matricula Inmobiliaria 50C-12345678.")

    save(pdf, "02_escritura.pdf")


# ═══════════════════════════════════════════════════════
# 3. Cedula de Ciudadania (simulated text)
# ═══════════════════════════════════════════════════════

def gen_cedula():
    pdf = new_pdf("CEDULA DE CIUDADANIA - REPUBLICA DE COLOMBIA")

    section(pdf, "DATOS PERSONALES")
    line(pdf, "Nombres: CARLOS ANDRES")
    line(pdf, "Apellidos: MARTINEZ LOPEZ")
    line(pdf, "Numero: 1.020.789.456")
    line(pdf, "Fecha de nacimiento: 15 de julio de 1985")
    line(pdf, "Lugar de nacimiento: Bogota D.C.")
    line(pdf, "Sexo: M")
    line(pdf, "Estatura: 1.78 m")
    line(pdf, "Grupo sanguineo: O+")
    line(pdf, "Fecha de expedicion: 10 de agosto de 2003")
    line(pdf, "Lugar de expedicion: Bogota D.C.")
    line(pdf, "")
    line(pdf, "Estado: VIGENTE")
    line(pdf, "")
    line(pdf, "[Este es un documento de prueba generado para testing del sistema]")

    save(pdf, "03_cedula.pdf")


# ═══════════════════════════════════════════════════════
# 4. Extractos Bancarios
# ═══════════════════════════════════════════════════════

def gen_extractos():
    pdf = new_pdf("EXTRACTO BANCARIO - CUENTA DE AHORROS")

    section(pdf, "BANCOLOMBIA S.A.")
    line(pdf, "Cuenta de Ahorros No. 456-789-12345")
    line(pdf, "Titular: CARLOS ANDRES MARTINEZ LOPEZ")
    line(pdf, "Cedula: 1.020.789.456")
    line(pdf, "Periodo: Enero 2026")
    line(pdf, "")

    section(pdf, "RESUMEN")
    line(pdf, "Saldo anterior:                    $45.230.000")
    line(pdf, "Total consignaciones:              $18.500.000")
    line(pdf, "Total retiros:                     $14.800.000")
    line(pdf, "Saldo final:                       $48.930.000")
    line(pdf, "Saldo promedio del mes:             $47.080.000")
    line(pdf, "")

    section(pdf, "DETALLE DE MOVIMIENTOS - Enero 2026")
    line(pdf, "Fecha       Descripcion                      Debito        Credito       Saldo")
    line(pdf, "01/01  Saldo anterior                                                    $45.230.000")
    line(pdf, "05/01  Nomina TECH SOLUTIONS SAS                           $9.250.000    $54.480.000")
    line(pdf, "07/01  Pago tarjeta Visa              $2.100.000                         $52.380.000")
    line(pdf, "10/01  Arriendo recibido                                   $3.500.000    $55.880.000")
    line(pdf, "12/01  Servicios publicos              $450.000                          $55.430.000")
    line(pdf, "15/01  Transferencia a terceros        $5.000.000                        $50.430.000")
    line(pdf, "20/01  Nomina TECH SOLUTIONS SAS                           $9.250.000    $59.680.000")
    line(pdf, "22/01  Cuota credito vehiculo          $1.850.000                        $57.830.000")
    line(pdf, "25/01  Compras supermercado             $900.000                         $56.930.000")
    line(pdf, "28/01  Seguros Sura                     $350.000                         $56.580.000")
    line(pdf, "30/01  Transferencia personal          $4.150.000                        $52.430.000")
    line(pdf, "")

    # Page 2 - February
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "EXTRACTO BANCARIO - Febrero 2026", ln=True, align="C")
    pdf.ln(4)

    section(pdf, "RESUMEN")
    line(pdf, "Saldo anterior:                    $52.430.000")
    line(pdf, "Total consignaciones:              $19.200.000")
    line(pdf, "Total retiros:                     $15.100.000")
    line(pdf, "Saldo final:                       $56.530.000")
    line(pdf, "Saldo promedio del mes:             $54.480.000")
    line(pdf, "")

    section(pdf, "DETALLE DE MOVIMIENTOS - Febrero 2026")
    line(pdf, "Fecha       Descripcion                      Debito        Credito       Saldo")
    line(pdf, "01/02  Saldo anterior                                                    $52.430.000")
    line(pdf, "05/02  Nomina TECH SOLUTIONS SAS                           $9.250.000    $61.680.000")
    line(pdf, "07/02  Pago tarjeta Visa              $2.300.000                         $59.380.000")
    line(pdf, "10/02  Arriendo recibido                                   $3.500.000    $62.880.000")
    line(pdf, "12/02  Servicios publicos              $480.000                          $62.400.000")
    line(pdf, "15/02  Ahorro programado              $3.000.000                         $59.400.000")
    line(pdf, "20/02  Nomina TECH SOLUTIONS SAS                           $9.450.000    $68.850.000")
    line(pdf, "22/02  Cuota credito vehiculo          $1.850.000                        $67.000.000")
    line(pdf, "25/02  Compras varias                  $1.200.000                        $65.800.000")
    line(pdf, "28/02  Transferencia a CDT             $6.270.000                        $59.530.000")
    line(pdf, "")

    # Page 3 - March
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "EXTRACTO BANCARIO - Marzo 2026", ln=True, align="C")
    pdf.ln(4)

    section(pdf, "RESUMEN")
    line(pdf, "Saldo anterior:                    $59.530.000")
    line(pdf, "Total consignaciones:              $18.750.000")
    line(pdf, "Total retiros:                     $13.900.000")
    line(pdf, "Saldo final:                       $64.380.000")
    line(pdf, "Saldo promedio del mes:             $61.955.000")
    line(pdf, "")

    section(pdf, "DETALLE DE MOVIMIENTOS - Marzo 2026")
    line(pdf, "Fecha       Descripcion                      Debito        Credito       Saldo")
    line(pdf, "01/03  Saldo anterior                                                    $59.530.000")
    line(pdf, "05/03  Nomina TECH SOLUTIONS SAS                           $9.250.000    $68.780.000")
    line(pdf, "08/03  Pago tarjeta Visa              $1.900.000                         $66.880.000")
    line(pdf, "10/03  Arriendo recibido                                   $3.500.000    $70.380.000")
    line(pdf, "12/03  Servicios publicos              $420.000                          $69.960.000")
    line(pdf, "20/03  Nomina TECH SOLUTIONS SAS                           $9.500.000    $79.460.000")
    line(pdf, "22/03  Cuota credito vehiculo          $1.850.000                        $77.610.000")
    line(pdf, "23/03  Compras                          $730.000                         $76.880.000")

    save(pdf, "04_extractos_bancarios.pdf")


# ═══════════════════════════════════════════════════════
# 5. Certificado Laboral / de Ingresos
# ═══════════════════════════════════════════════════════

def gen_certificado_ingresos():
    pdf = new_pdf("CERTIFICADO LABORAL Y DE INGRESOS")

    section(pdf, "TECH SOLUTIONS S.A.S.")
    line(pdf, "NIT: 901.234.567-8")
    line(pdf, "Direccion: Carrera 7 # 72-64, Oficina 801, Bogota D.C.")
    line(pdf, "Telefono: (601) 345-6789")
    line(pdf, "")
    line(pdf, "Bogota D.C., 10 de marzo de 2026")
    line(pdf, "")

    section(pdf, "A QUIEN INTERESE")
    line(pdf, "")
    line(pdf, "La suscrita Directora de Recursos Humanos de TECH SOLUTIONS S.A.S.,")
    line(pdf, "identificada con NIT 901.234.567-8, certifica que:")
    line(pdf, "")
    line(pdf, "El senor CARLOS ANDRES MARTINEZ LOPEZ, identificado con Cedula de")
    line(pdf, "Ciudadania No. 1.020.789.456, se encuentra vinculado laboralmente")
    line(pdf, "con nuestra empresa desde el 1 de febrero de 2020, desempenando")
    line(pdf, "el cargo de GERENTE DE TECNOLOGIA.")
    line(pdf, "")

    section(pdf, "INFORMACION SALARIAL")
    line(pdf, "Tipo de contrato: Termino indefinido")
    line(pdf, "Salario basico mensual:           $9.250.000 COP")
    line(pdf, "Bonificaciones promedio mensual:  $2.500.000 COP")
    line(pdf, "Auxilio de transporte:            No aplica")
    line(pdf, "Total ingreso promedio mensual:   $11.750.000 COP")
    line(pdf, "")
    line(pdf, "Ingreso anual certificado 2025:   $141.000.000 COP")
    line(pdf, "")

    section(pdf, "INFORMACION ADICIONAL")
    line(pdf, "Antiguedad: 6 anos y 1 mes")
    line(pdf, "Horario: Lunes a Viernes, 8:00am - 6:00pm")
    line(pdf, "Sede: Bogota - Oficina principal")
    line(pdf, "")
    line(pdf, "El presente certificado se expide a solicitud del interesado para")
    line(pdf, "tramites crediticios.")
    line(pdf, "")
    line(pdf, "Cordialmente,")
    line(pdf, "")
    line(pdf, "DIANA PATRICIA GOMEZ HERRERA")
    line(pdf, "Directora de Recursos Humanos")
    line(pdf, "TECH SOLUTIONS S.A.S.")

    save(pdf, "05_certificado_ingresos.pdf")


# ═══════════════════════════════════════════════════════
# 6. Declaracion de Renta (simplified)
# ═══════════════════════════════════════════════════════

def gen_declaracion_renta():
    pdf = new_pdf("DECLARACION DE RENTA - ANO GRAVABLE 2024")

    section(pdf, "DIRECCION DE IMPUESTOS Y ADUANAS NACIONALES - DIAN")
    line(pdf, "Formulario 210 - Declaracion de Renta Personas Naturales")
    line(pdf, "Ano gravable: 2024")
    line(pdf, "")

    section(pdf, "DATOS DEL DECLARANTE")
    line(pdf, "Nombre: CARLOS ANDRES MARTINEZ LOPEZ")
    line(pdf, "NIT/CC: 1.020.789.456")
    line(pdf, "Direccion: Calle 85 # 12-45, Apto 501, Bogota")
    line(pdf, "Actividad economica: 6201 - Actividades de desarrollo de sistemas informaticos")
    line(pdf, "")

    section(pdf, "PATRIMONIO")
    line(pdf, "31. Total patrimonio bruto:                    $1.250.000.000")
    line(pdf, "    - Bienes inmuebles:                          $680.000.000")
    line(pdf, "    - Inversiones y cuentas:                     $320.000.000")
    line(pdf, "    - Vehiculos:                                  $85.000.000")
    line(pdf, "    - Otros activos:                             $165.000.000")
    line(pdf, "32. Total deudas:                                $120.000.000")
    line(pdf, "    - Credito vehiculo:                           $45.000.000")
    line(pdf, "    - Tarjetas de credito:                        $12.000.000")
    line(pdf, "    - Otras obligaciones:                         $63.000.000")
    line(pdf, "33. Total patrimonio liquido:                  $1.130.000.000")
    line(pdf, "")

    section(pdf, "INGRESOS")
    line(pdf, "34. Ingresos brutos por rentas de trabajo:      $141.000.000")
    line(pdf, "    (Salarios + bonificaciones)")
    line(pdf, "35. Ingresos por arriendos:                      $42.000.000")
    line(pdf, "36. Ingresos por rendimientos financieros:        $8.500.000")
    line(pdf, "37. Total ingresos brutos:                      $191.500.000")
    line(pdf, "")

    section(pdf, "DEDUCCIONES Y RENTAS EXENTAS")
    line(pdf, "42. Aportes obligatorios salud y pension:        $18.500.000")
    line(pdf, "43. Aportes voluntarios AFC:                     $12.000.000")
    line(pdf, "44. Intereses de vivienda:                              $0")
    line(pdf, "45. Total deducciones:                           $30.500.000")
    line(pdf, "")

    section(pdf, "LIQUIDACION")
    line(pdf, "50. Renta liquida gravable:                     $161.000.000")
    line(pdf, "51. Impuesto sobre la renta:                     $38.240.000")
    line(pdf, "52. Retenciones en la fuente:                    $32.100.000")
    line(pdf, "53. Saldo a pagar:                                $6.140.000")
    line(pdf, "")
    line(pdf, "Fecha de presentacion: 12 de agosto de 2025")

    save(pdf, "06_declaracion_renta.pdf")


# ═══════════════════════════════════════════════════════
# Run all
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generando documentos de prueba para Aluri...\n")
    gen_libertad_tradicion()
    gen_escritura()
    gen_cedula()
    gen_extractos()
    gen_certificado_ingresos()
    gen_declaracion_renta()
    print("\nListo! 6 PDFs generados en test-docs/")
    print("\nDatos del solicitante de prueba:")
    print("  Nombre: Carlos Andres Martinez Lopez")
    print("  Cedula: 1.020.789.456")
    print("  Salario: $9.250.000/mes + $2.500.000 bonificacion")
    print("  Empleador: Tech Solutions S.A.S.")
    print("  Inmueble: Calle 85 #12-45 Apto 501, Chico Norte, Bogota")
    print("  Valor inmueble: ~$680.000.000")
    print("  Inmueble: Libre de gravamenes")
