'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PdfViewerProps {
  url: string
  className?: string
}

export default function PdfViewer({ url, className = '' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setPageNumber(1)
    setLoading(false)
  }, [])

  const onDocumentLoadError = useCallback(() => {
    setLoading(false)
  }, [])

  const goToPrev = () => setPageNumber(p => Math.max(1, p - 1))
  const goToNext = () => setPageNumber(p => Math.min(numPages, p + 1))
  const zoomIn = () => setScale(s => Math.min(3, s + 0.25))
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.25))

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      {numPages > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              disabled={pageNumber <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 rounded transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-300 min-w-[80px] text-center">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={goToNext}
              disabled={pageNumber >= numPages}
              className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 rounded transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] text-slate-400 min-w-[36px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 rounded transition-colors"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-slate-950 flex justify-center">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Cargando PDF...
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="mx-auto"
          />
        </Document>
      </div>
    </div>
  )
}
