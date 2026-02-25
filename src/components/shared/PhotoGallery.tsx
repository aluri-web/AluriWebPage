'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function PhotoGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const goTo = useCallback((index: number) => {
    setSelectedIndex(((index % images.length) + images.length) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex])
  const goNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, goPrev, goNext])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  return (
    <>
      {/* Gallery card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
        <div
          className="relative aspect-video cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={images[selectedIndex]}
            alt="Propiedad"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-lg text-white text-sm">
            {selectedIndex + 1}/{images.length}
          </div>
        </div>
        {images.length > 1 && (
          <div className="p-4 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer ring-2 transition-all ${
                  i === selectedIndex ? 'ring-teal-400' : 'ring-transparent hover:ring-zinc-500'
                }`}
              >
                <Image
                  src={img}
                  alt={`Propiedad ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
          >
            <X size={28} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-10 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex]}
              alt={`Propiedad ${selectedIndex + 1}`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-10 transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Thumbnails strip */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2 bg-black/50 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer ring-2 transition-all ${
                    i === selectedIndex ? 'ring-teal-400 opacity-100' : 'ring-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Miniatura ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
