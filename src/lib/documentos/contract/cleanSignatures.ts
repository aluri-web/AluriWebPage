import PizZip from 'pizzip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function paragraphText(p: Element): string {
  const ts = p.getElementsByTagNameNS(W_NS, 't')
  let acc = ''
  for (let i = 0; i < ts.length; i++) {
    acc += ts[i].textContent || ''
  }
  return acc.trim()
}

function esLineaFirma(txt: string): boolean {
  if (!txt.includes('___')) return false
  return txt.replace(/_/g, '').trim().length === 0
}

function limpiarCelda(cell: Element) {
  const paras: Element[] = []
  const pList = cell.getElementsByTagNameNS(W_NS, 'p')
  for (let i = 0; i < pList.length; i++) {
    if (pList[i].parentNode === cell) paras.push(pList[i])
  }

  const aEliminar = new Set<Element>()

  for (let i = 0; i < paras.length; i++) {
    const txt = paragraphText(paras[i])
    if (!esLineaFirma(txt)) continue

    const nombre = i + 1 < paras.length ? paragraphText(paras[i + 1]) : ''
    const docIdentif = i + 2 < paras.length ? paragraphText(paras[i + 2]) : ''

    if (!nombre) {
      // Vaciados previos (hasta 3 atras) + linea + nombre + doc
      let j = i - 1
      while (j >= 0 && paragraphText(paras[j]) === '') {
        aEliminar.add(paras[j])
        j--
      }
      aEliminar.add(paras[i])
      if (i + 1 < paras.length) aEliminar.add(paras[i + 1])
      if (i + 2 < paras.length) aEliminar.add(paras[i + 2])
      i += 2
      continue
    }

    // Si el doc solo dice "No." (sin cedula), limpiar esa linea
    if (docIdentif && /^\s*No\.?\s*$/.test(docIdentif) && i + 2 < paras.length) {
      aEliminar.add(paras[i + 2])
    }
  }

  aEliminar.forEach((p) => {
    p.parentNode?.removeChild(p)
  })
}

export function limpiarFirmasVaciasV4(docxBuffer: Buffer): Buffer {
  const zip = new PizZip(docxBuffer)
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) return docxBuffer

  const xmlStr = xmlFile.asText()
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml')

  const cells = doc.getElementsByTagNameNS(W_NS, 'tc')
  for (let i = 0; i < cells.length; i++) {
    limpiarCelda(cells[i] as unknown as Element)
  }

  const serialized = new XMLSerializer().serializeToString(doc)
  zip.file('word/document.xml', serialized)

  return zip.generate({ type: 'nodebuffer' })
}
