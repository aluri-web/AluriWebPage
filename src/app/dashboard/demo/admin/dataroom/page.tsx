'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, FolderOpen, Maximize2, X } from 'lucide-react'

interface DataroomDocument {
  name: string
  displayName: string
  url: string
  createdAt: string
  size: number
  folder: string
}

export default function DemoDataroomPage() {
  const [documents, setDocuments] = useState<DataroomDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/dataroom?visibility=publico')
        const data = await res.json()
        if (data.success) {
          setDocuments(data.documents)
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  const selectDocument = async (doc: DataroomDocument) => {
    setSelectedDoc(doc.name)
    setSelectedName(doc.displayName)
    setLoadingDoc(true)
    try {
      const filePath = `${doc.folder}/${doc.name}`
      const res = await fetch(`/api/dataroom?file=${encodeURIComponent(filePath)}`)
      const text = await res.text()
      setHtmlContent(text)
    } catch (error) {
      console.error('Error fetching document:', error)
      setHtmlContent('<p>Error al cargar el documento</p>')
    } finally {
      setLoadingDoc(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dataroom</h1>
          <p className="text-sm text-slate-400 mt-1">Documentos internos de la empresa</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 font-medium rounded-lg cursor-not-allowed opacity-50"
        >
          Subir HTML
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Cargando documentos...
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <FolderOpen size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Sin documentos</p>
          <p className="text-sm mt-1">No hay archivos publicos en el dataroom</p>
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* Document list */}
          <div className="w-72 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
              <span className="text-sm text-slate-400">
                {documents.length} documento{documents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    selectedDoc === doc.name
                      ? 'bg-teal-500/10 border-l-2 border-teal-400'
                      : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                  }`}
                  onClick={() => selectDocument(doc)}
                >
                  <FileText
                    size={18}
                    className={selectedDoc === doc.name ? 'text-teal-400' : 'text-slate-500'}
                  />
                  <span
                    className={`flex-1 text-sm truncate ${
                      selectedDoc === doc.name ? 'text-teal-400 font-medium' : 'text-slate-300'
                    }`}
                  >
                    {doc.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Document viewer */}
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                  <span className="text-sm text-white font-medium">{selectedName}</span>
                  <button
                    onClick={() => setFullscreen(true)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    title="Pantalla completa"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
                {loadingDoc ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    Cargando...
                  </div>
                ) : (
                  <iframe
                    srcDoc={htmlContent || ''}
                    className="flex-1 w-full bg-white"
                    title={selectedName}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Selecciona un documento para visualizarlo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && htmlContent && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
            <span className="text-sm text-white font-medium">{selectedName}</span>
            <button
              onClick={() => setFullscreen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <iframe
            srcDoc={htmlContent}
            className="flex-1 w-full bg-white"
            title={selectedName}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  )
}
