import PizZip from 'pizzip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

// xmldom expone tipos propios de Node/Element que divergen del DOM nativo
// de lib.dom.d.ts. Usamos 'any' en los handles de nodos aqui para evitar
// fricciones de types sin perder el cheking de logica.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any

function paragraphText(p: XmlNode): string {
  const ts = p.getElementsByTagNameNS(W_NS, 't')
  let acc = ''
  for (let i = 0; i < ts.length; i++) {
    acc += ts[i].textContent || ''
  }
  return acc
}

/**
 * Inserta un <w:p> con <w:br w:type="page"/> antes del primer parrafo que
 * incluya `marcador` en su texto. Idempotente: si ya hay un page break en
 * el parrafo inmediatamente anterior, no agrega otro.
 */
export function insertarPageBreakAntesDe(docxBuffer: Buffer, marcador: string): Buffer {
  const zip = new PizZip(docxBuffer)
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) return docxBuffer

  const xmlStr = xmlFile.asText()
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml')

  const paras = doc.getElementsByTagNameNS(W_NS, 'p')
  let targetIdx = -1
  for (let i = 0; i < paras.length; i++) {
    if (paragraphText(paras[i]).includes(marcador)) {
      targetIdx = i
      break
    }
  }
  if (targetIdx < 0) return docxBuffer

  const targetPara: XmlNode = paras[targetIdx]

  // Idempotencia: si el parrafo anterior ya contiene un page break, no hacer nada.
  if (targetIdx > 0) {
    const prev: XmlNode = paras[targetIdx - 1]
    const brs = prev.getElementsByTagNameNS(W_NS, 'br')
    for (let i = 0; i < brs.length; i++) {
      const type = brs[i].getAttributeNS(W_NS, 'type') || brs[i].getAttribute('w:type')
      if (type === 'page') return docxBuffer
    }
  }

  // Parrafo solo con page break. Parseamos un fragmento XML para que los
  // namespaces queden consistentes con el documento principal.
  const fragment = new DOMParser().parseFromString(
    `<w:p xmlns:w="${W_NS}"><w:r><w:br w:type="page"/></w:r></w:p>`,
    'text/xml'
  )
  const newPara: XmlNode = doc.importNode(fragment.documentElement, true)
  targetPara.parentNode?.insertBefore(newPara, targetPara)

  const serialized = new XMLSerializer().serializeToString(doc)
  zip.file('word/document.xml', serialized)

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}
