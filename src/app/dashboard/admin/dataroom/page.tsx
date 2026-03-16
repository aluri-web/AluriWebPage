'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, Trash2, FileText, Loader2, FolderOpen, Maximize2, X, Download,
  Globe, Lock, FolderPlus, ChevronRight, ArrowLeft, File,
  FileSpreadsheet, FileImage, Presentation, FileCode,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false })

interface DataroomFolder {
  type: 'folder'
  name: string
  path: string
}

interface DataroomFile {
  type: 'file'
  name: string
  displayName: string
  path: string
  ext: string
  category: string
  size: number
  createdAt: string
  visibility: 'publico' | 'privado'
}

type DataroomItem = DataroomFolder | DataroomFile

function fileIcon(category: string, ext: string) {
  switch (category) {
    case 'pdf': return <FileText size={18} className="text-red-400" />
    case 'image': return <FileImage size={18} className="text-blue-400" />
    case 'office':
      if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet size={18} className="text-emerald-400" />
      if (['pptx', 'ppt'].includes(ext)) return <Presentation size={18} className="text-orange-400" />
      return <FileText size={18} className="text-blue-400" />
    case 'html': return <FileCode size={18} className="text-amber-400" />
    case 'text': return <FileText size={18} className="text-slate-400" />
    default: return <File size={18} className="text-slate-400" />
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_EXTENSIONS = '.html,.pdf,.doc,.docx,.xlsx,.xls,.csv,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.gif,.svg,.txt,.md'

export default function DataroomPage() {
  const [visibility, setVisibility] = useState<'privado' | 'publico'>('privado')
  const [currentPath, setCurrentPath] = useState('dataroom/privado')
  const [folders, setFolders] = useState<DataroomFolder[]>([])
  const [files, setFiles] = useState<DataroomFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Selection & preview
  const [selectedFile, setSelectedFile] = useState<DataroomFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Folder creation
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Deletion
  const [deleting, setDeleting] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dataroom?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.success) {
        setFolders(data.folders || [])
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching dataroom items:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(currentPath)
  }, [currentPath, fetchItems])

  // Breadcrumbs
  const breadcrumbs = (() => {
    const parts = currentPath.split('/')
    // parts[0] = 'dataroom', parts[1] = 'publico'|'privado', ...rest
    const crumbs: { label: string; path: string }[] = []
    for (let i = 1; i < parts.length; i++) {
      crumbs.push({
        label: i === 1 ? (parts[i] === 'publico' ? 'Publico' : 'Privado') : parts[i],
        path: parts.slice(0, i + 1).join('/'),
      })
    }
    return crumbs
  })()

  const navigateTo = (path: string) => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setHtmlContent(null)
    setTextContent(null)
    setCurrentPath(path)
  }

  const switchVisibility = (vis: 'publico' | 'privado') => {
    setVisibility(vis)
    navigateTo(`dataroom/${vis}`)
  }

  const goUp = () => {
    const parts = currentPath.split('/')
    if (parts.length > 2) {
      navigateTo(parts.slice(0, -1).join('/'))
    }
  }

  // --- File preview ---
  const selectFile = async (file: DataroomFile) => {
    setSelectedFile(file)
    setLoadingPreview(true)
    setPreviewUrl(null)
    setHtmlContent(null)
    setTextContent(null)

    try {
      const apiUrl = `/api/dataroom?file=${encodeURIComponent(file.path)}`

      if (file.category === 'pdf') {
        const res = await fetch(apiUrl)
        const blob = await res.blob()
        const pdfBlob = new Blob([blob], { type: 'application/pdf' })
        setPreviewUrl(URL.createObjectURL(pdfBlob))
      } else if (file.category === 'html') {
        const res = await fetch(apiUrl)
        const text = await res.text()
        setHtmlContent(text)
      } else if (file.category === 'image') {
        const res = await fetch(apiUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      } else if (file.category === 'text') {
        const res = await fetch(apiUrl)
        const text = await res.text()
        setTextContent(text)
      }
      // office: no inline preview
    } catch (error) {
      console.error('Error loading preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  // --- Upload ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', currentPath)

      const res = await fetch('/api/dataroom', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.success) {
        await fetchItems(currentPath)
      } else {
        alert(data.error || 'Error al subir archivo')
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Error al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- Create folder ---
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/dataroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-folder', name: newFolderName.trim(), path: currentPath }),
      })
      const data = await res.json()
      if (data.success) {
        setShowNewFolder(false)
        setNewFolderName('')
        await fetchItems(currentPath)
      } else {
        alert(data.error || 'Error al crear carpeta')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setCreatingFolder(false)
    }
  }

  // --- Delete file ---
  const handleDeleteFile = async (file: DataroomFile) => {
    if (!confirm(`Eliminar "${file.displayName}.${file.ext}"?`)) return
    setDeleting(file.path)
    try {
      const res = await fetch('/api/dataroom', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.path }),
      })
      const data = await res.json()
      if (data.success) {
        if (selectedFile?.path === file.path) {
          setSelectedFile(null)
          setPreviewUrl(null)
          setHtmlContent(null)
          setTextContent(null)
        }
        setFiles(prev => prev.filter(f => f.path !== file.path))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    } finally {
      setDeleting(null)
    }
  }

  // --- Delete folder ---
  const handleDeleteFolder = async (folder: DataroomFolder) => {
    if (!confirm(`Eliminar carpeta "${folder.name}" y todo su contenido?`)) return
    setDeleting(folder.path)
    try {
      const res = await fetch('/api/dataroom', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folder.path, action: 'delete-folder' }),
      })
      const data = await res.json()
      if (data.success) {
        setFolders(prev => prev.filter(f => f.path !== folder.path))
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    } finally {
      setDeleting(null)
    }
  }

  // --- Download ---
  const handleDownload = async () => {
    if (!selectedFile) return
    try {
      const res = await fetch(`/api/dataroom?file=${encodeURIComponent(selectedFile.path)}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedFile.displayName}.${selectedFile.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading:', error)
    }
  }

  // --- Preview renderer ---
  const renderPreview = () => {
    if (!selectedFile) return null

    if (loadingPreview) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Cargando...
        </div>
      )
    }

    if (selectedFile.category === 'html' && htmlContent) {
      return (
        <iframe
          srcDoc={htmlContent}
          className="flex-1 w-full bg-white"
          title={selectedFile.displayName}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )
    }

    if (selectedFile.category === 'pdf' && previewUrl) {
      return <PdfViewer url={previewUrl} className="flex-1" />
    }

    if (selectedFile.category === 'image' && previewUrl) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={selectedFile.displayName}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )
    }

    if (selectedFile.category === 'text' && textContent !== null) {
      return (
        <div className="flex-1 overflow-auto bg-slate-950 p-6">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{textContent}</pre>
        </div>
      )
    }

    // Office files or unknown — no inline preview
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center">
            {fileIcon(selectedFile.category, selectedFile.ext)}
          </div>
          <div>
            <p className="text-white font-medium">{selectedFile.displayName}.{selectedFile.ext}</p>
            <p className="text-sm text-slate-400 mt-1">{formatSize(selectedFile.size)}</p>
            <p className="text-xs text-slate-500 mt-1">Vista previa no disponible para este formato</p>
          </div>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-black font-medium rounded-xl transition-colors text-sm"
          >
            <Download size={16} />
            Descargar archivo
          </button>
        </div>
      </div>
    )
  }

  // --- Fullscreen preview ---
  const renderFullscreenPreview = () => {
    if (!selectedFile) return null

    if (selectedFile.category === 'html' && htmlContent) {
      return (
        <iframe
          srcDoc={htmlContent}
          className="flex-1 w-full bg-white"
          title={selectedFile.displayName}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )
    }
    if (selectedFile.category === 'pdf' && previewUrl) {
      return <PdfViewer url={previewUrl} className="flex-1" />
    }
    if (selectedFile.category === 'image' && previewUrl) {
      return (
        <div className="flex-1 flex items-center justify-center bg-black p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={selectedFile.displayName} className="max-w-full max-h-full object-contain" />
        </div>
      )
    }
    if (selectedFile.category === 'text' && textContent !== null) {
      return (
        <div className="flex-1 overflow-auto bg-slate-950 p-8">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{textContent}</pre>
        </div>
      )
    }
    return null
  }

  const canFullscreen = selectedFile && (
    (selectedFile.category === 'html' && htmlContent) ||
    (selectedFile.category === 'pdf' && previewUrl) ||
    (selectedFile.category === 'image' && previewUrl) ||
    (selectedFile.category === 'text' && textContent !== null)
  )

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-64px)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Dataroom</h1>
          <p className="text-sm text-slate-400 mt-1">
            Documentos internos — {folders.length} carpeta{folders.length !== 1 ? 's' : ''}, {files.length} archivo{files.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Visibility toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => switchVisibility('privado')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                visibility === 'privado' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock size={13} />
              Privado
            </button>
            <button
              onClick={() => switchVisibility('publico')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                visibility === 'publico' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={13} />
              Publico
            </button>
          </div>

          {/* New folder */}
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            <FolderPlus size={16} />
            Carpeta
          </button>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-black font-medium rounded-lg transition-colors text-sm"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Subiendo...</>
            ) : (
              <><Upload size={16} /> Subir archivo</>
            )}
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 mb-4 flex-shrink-0">
        {currentPath.split('/').length > 2 && (
          <button
            onClick={goUp}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <FolderOpen size={14} className="text-slate-500" />
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-slate-600" />}
            <button
              onClick={() => navigateTo(crumb.path)}
              className={`text-sm px-1.5 py-0.5 rounded transition-colors ${
                i === breadcrumbs.length - 1
                  ? 'text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </div>

      {/* New folder inline form */}
      {showNewFolder && (
        <div className="flex items-center gap-3 mb-4 flex-shrink-0 bg-slate-800 rounded-xl border border-slate-700 p-3">
          <FolderPlus size={18} className="text-teal-400 flex-shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Nombre de la carpeta..."
            autoFocus
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || creatingFolder}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-black font-medium rounded-lg text-sm transition-colors"
          >
            {creatingFolder ? <Loader2 size={14} className="animate-spin" /> : 'Crear'}
          </button>
          <button
            onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
            className="p-2 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Cargando...
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <FolderOpen size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Carpeta vacia</p>
          <p className="text-sm mt-1">Sube archivos o crea subcarpetas para organizar</p>
        </div>
      ) : (
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Sidebar — folders + files list */}
          <div className="w-80 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/30">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Contenido</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {/* Folders */}
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800/50 group"
                >
                  <FolderOpen size={18} className="text-amber-400 flex-shrink-0" />
                  <span
                    className="flex-1 text-sm text-slate-300 truncate"
                    onClick={() => navigateTo(folder.path)}
                  >
                    {folder.name}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 cursor-pointer"
                    onClick={() => navigateTo(folder.path)}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                    disabled={deleting === folder.path}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Eliminar carpeta"
                  >
                    {deleting === folder.path ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                    selectedFile?.path === file.path
                      ? 'bg-teal-500/10 border-l-2 border-teal-400'
                      : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                  }`}
                  onClick={() => selectFile(file)}
                >
                  <div className="flex-shrink-0">{fileIcon(file.category, file.ext)}</div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${
                      selectedFile?.path === file.path ? 'text-teal-400 font-medium' : 'text-slate-300'
                    }`}>
                      {file.displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {file.ext} · {formatSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(file) }}
                    disabled={deleting === file.path}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Eliminar"
                  >
                    {deleting === file.path ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preview pane */}
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(selectedFile.category, selectedFile.ext)}
                    <span className="text-sm text-white font-medium truncate">
                      {selectedFile.displayName}.{selectedFile.ext}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formatSize(selectedFile.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={handleDownload}
                      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </button>
                    {canFullscreen && (
                      <button
                        onClick={() => setFullscreen(true)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Pantalla completa"
                      >
                        <Maximize2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {renderPreview()}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Selecciona un archivo para visualizarlo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center gap-2">
              {fileIcon(selectedFile.category, selectedFile.ext)}
              <span className="text-sm text-white font-medium">{selectedFile.displayName}.{selectedFile.ext}</span>
            </div>
            <button
              onClick={() => setFullscreen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          {renderFullscreenPreview()}
        </div>
      )}
    </div>
  )
}
