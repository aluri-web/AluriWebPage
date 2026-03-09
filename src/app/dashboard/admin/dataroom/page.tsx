'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, FileText, Loader2, FolderOpen, Maximize2, X, Download } from 'lucide-react'

interface DataroomDocument {
  name: string
  displayName: string
  url: string
  createdAt: string
  size: number
}

export default function DataroomPage() {
  const [documents, setDocuments] = useState<DataroomDocument[]>([])
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null) // doc.name as key
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/dataroom')
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

  useEffect(() => {
    fetchDocuments()
  }, [])

  const selectDocument = async (doc: DataroomDocument) => {
    setSelectedDoc(doc.name)
    setSelectedName(doc.displayName)
    setLoadingDoc(true)
    try {
      const res = await fetch(doc.url)
      const text = await res.text()
      setHtmlContent(text)
    } catch (error) {
      console.error('Error fetching document:', error)
      setHtmlContent('<p>Error al cargar el documento</p>')
    } finally {
      setLoadingDoc(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/dataroom', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        await fetchDocuments()
      } else {
        alert(data.error || 'Error al subir archivo')
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Error al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = () => {
    if (!htmlContent || !selectedName) return

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedName}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm('Eliminar este documento?')) return

    setDeleting(fileName)
    try {
      const res = await fetch('/api/dataroom', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      })

      const data = await res.json()
      if (data.success) {
        if (selectedDoc === fileName) {
          setSelectedDoc(null)
          setSelectedName('')
          setHtmlContent(null)
        }
        setDocuments(prev => prev.filter(d => d.name !== fileName))
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dataroom</h1>
          <p className="text-sm text-slate-400 mt-1">Documentos internos de la empresa</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-black font-medium rounded-lg transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={18} />
                Subir HTML
              </>
            )}
          </button>
        </div>
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
          <p className="text-sm mt-1">Sube archivos HTML para comenzar</p>
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Document list */}
          <div className="w-72 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
              <span className="text-sm text-slate-400">{documents.length} documento{documents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {documents.map(doc => (
                <div
                  key={doc.name}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                    selectedDoc === doc.name
                      ? 'bg-teal-500/10 border-l-2 border-teal-400'
                      : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                  }`}
                  onClick={() => selectDocument(doc)}
                >
                  <FileText size={18} className={selectedDoc === doc.name ? 'text-teal-400' : 'text-slate-500'} />
                  <span className={`flex-1 text-sm truncate ${selectedDoc === doc.name ? 'text-teal-400 font-medium' : 'text-slate-300'}`}>
                    {doc.displayName}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.name) }}
                    disabled={deleting === doc.name}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar"
                  >
                    {deleting === doc.name ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDownload}
                      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Descargar HTML"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => setFullscreen(true)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Pantalla completa"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
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
