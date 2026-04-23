import PizZip from 'pizzip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

// xmldom expone tipos propios de Node/Element que divergen del DOM nativo
// de lib.dom.d.ts. Usamos 'any' en los handles de nodos aqui para evitar
// fricciones de types sin perder el checking de logica.
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

function parrafoYaEsPageBreak(p: XmlNode): boolean {
  const brs = p.getElementsByTagNameNS(W_NS, 'br')
  for (let i = 0; i < brs.length; i++) {
    const type = brs[i].getAttributeNS(W_NS, 'type') || brs[i].getAttribute('w:type')
    if (type === 'page') return true
  }
  return false
}

/**
 * Inserta un <w:p> con <w:br w:type="page"/> antes del primer parrafo que
 * incluya cada marcador en su texto. Idempotente: si ya hay un page break
 * en el parrafo inmediatamente anterior, no agrega otro.
 */
export function insertarPageBreaksAntesDe(
  docxBuffer: Buffer,
  marcadores: string[]
): Buffer {
  if (marcadores.length === 0) return docxBuffer

  const zip = new PizZip(docxBuffer)
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) return docxBuffer

  const xmlStr = xmlFile.asText()
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml')
  const paras = doc.getElementsByTagNameNS(W_NS, 'p')

  // Recolectamos los indices objetivo. Solo matcheamos parrafos cuyo
  // texto trimmed es EXACTAMENTE el marcador (asi evitamos que "Anexo
  // No. 2" matchee la frase "30.2. Anexo No. 2: Pagares..." que es una
  // referencia interna, no el titulo de seccion standalone).
  const targetsByMarker: { marker: string; index: number }[] = []
  const usedIndices = new Set<number>()
  for (const marker of marcadores) {
    const markerTrim = marker.trim()
    for (let i = 0; i < paras.length; i++) {
      if (usedIndices.has(i)) continue
      if (paragraphText(paras[i]).trim() === markerTrim) {
        targetsByMarker.push({ marker, index: i })
        usedIndices.add(i)
        break
      }
    }
  }
  if (targetsByMarker.length === 0) return docxBuffer

  // Inserción: iteramos de mayor a menor indice.
  targetsByMarker.sort((a, b) => b.index - a.index)

  let cambios = 0
  for (const { index } of targetsByMarker) {
    const targetPara: XmlNode = paras[index]
    if (index > 0 && parrafoYaEsPageBreak(paras[index - 1])) continue

    const fragment = new DOMParser().parseFromString(
      `<w:p xmlns:w="${W_NS}"><w:r><w:br w:type="page"/></w:r></w:p>`,
      'text/xml'
    )
    const newPara: XmlNode = doc.importNode(fragment.documentElement, true)
    targetPara.parentNode?.insertBefore(newPara, targetPara)
    cambios++
  }

  if (cambios === 0) return docxBuffer

  const serialized = new XMLSerializer().serializeToString(doc)
  zip.file('word/document.xml', serialized)
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

/** Variante de un solo marcador — wrapper legacy. */
export function insertarPageBreakAntesDe(docxBuffer: Buffer, marcador: string): Buffer {
  return insertarPageBreaksAntesDe(docxBuffer, [marcador])
}
