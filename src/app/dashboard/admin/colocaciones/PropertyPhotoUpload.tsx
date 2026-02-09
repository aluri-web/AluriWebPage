'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface PropertyPhotoUploadProps {
  photos: string[]
  onChange: (photos: string[]) => void
  loanCode: string
  maxPhotos?: number
}

export default function PropertyPhotoUpload({
  photos,
  onChange,
  loanCode,
  maxPhotos = 10
}: PropertyPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = maxPhotos - photos.length
    if (remainingSlots <= 0) {
      alert(`Maximo ${maxPhotos} fotos permitidas`)
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setUploading(true)
    setUploadProgress(0)

    const newUrls: string[] = []
    const totalFiles = filesToUpload.length

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]

      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`La imagen ${file.name} excede 5MB`)
        continue
      }

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('loanCode', loanCode)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success && result.url) {
          newUrls.push(result.url)
        } else {
          console.error('Upload failed:', result.error)
        }

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    onChange([...photos, ...newUrls])
    setUploading(false)
    setUploadProgress(0)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async (urlToRemove: string) => {
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToRemove }),
      })
    } catch (error) {
      console.error('Error deleting file:', error)
    }

    // Remove from state regardless of deletion result
    onChange(photos.filter(url => url !== urlToRemove))
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || photos.length >= maxPhotos}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Subiendo... {uploadProgress}%
            </>
          ) : (
            <>
              <ImagePlus size={18} />
              Agregar Fotos
            </>
          )}
        </button>
        <span className="text-xs text-slate-500">
          {photos.length}/{maxPhotos} fotos (max 5MB c/u)
        </span>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 group"
            >
              <img
                src={url}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(url)}
                className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <span className="text-white text-xs font-medium">#{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !uploading && (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-700 rounded-lg text-slate-500">
          <ImageIcon size={32} className="mb-2 opacity-50" />
          <p className="text-sm">Sin fotos del inmueble</p>
          <p className="text-xs mt-1">Click en "Agregar Fotos" para subir</p>
        </div>
      )}
    </div>
  )
}
