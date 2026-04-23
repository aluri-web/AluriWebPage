import PizZip from 'pizzip'

/**
 * Reescribe footer2.xml y footer3.xml (usados en paginas default y primera)
 * con un pie estandarizado "Pagina PAGE de NUMPAGES" donde ambos numeros
 * son fields dinamicos de Word. Tambien asegura w:updateFields=true en
 * settings.xml para que Word recalcule los fields al abrir el .docx sin
 * preguntar al usuario.
 *
 * Bug que arregla: el template v5 tenia footer con PAGE dinamico pero
 * NUMPAGES como texto estatico "19" -- asi todos los contratos mostraban
 * "19" aunque tuvieran otro total.
 */

const FOOTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 wp14 w15"><w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:lineRule="auto" w:line="240" w:before="0" w:after="0"/><w:jc w:val="center"/><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Página </w:t></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve"> de </w:t></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`

function asegurarUpdateFields(zip: PizZip): void {
  const settings = zip.file('word/settings.xml')
  if (!settings) return
  let xml = settings.asText()

  // Si ya existe w:updateFields, solo asegurar w:val=true.
  if (/<w:updateFields\b/i.test(xml)) {
    xml = xml.replace(/<w:updateFields[^\/>]*\/?>/i, '<w:updateFields w:val="true"/>')
  } else {
    // Insertarlo justo despues de la apertura de <w:settings ...>
    xml = xml.replace(/(<w:settings\b[^>]*>)/i, '$1<w:updateFields w:val="true"/>')
  }
  zip.file('word/settings.xml', xml)
}

export function aplicarPiePaginaDinamico(docxBuffer: Buffer): Buffer {
  const zip = new PizZip(docxBuffer)

  // Reescribir los footers que muestran "Pagina X de Y" (default + first).
  // footer1.xml se deja como esta (even pages, usualmente vacio).
  for (const name of ['word/footer2.xml', 'word/footer3.xml']) {
    if (zip.file(name)) {
      zip.file(name, FOOTER_XML)
    }
  }

  asegurarUpdateFields(zip)

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}
