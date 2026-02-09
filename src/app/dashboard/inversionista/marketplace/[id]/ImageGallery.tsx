'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  propertyTitle: string
}

export default function ImageGallery({ images, propertyTitle }: ImageGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const openModal = (index: number) => {
    setSelectedImageIndex(index)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      {/* Image Gallery */}
      <div className="border border-white/5 rounded-2xl overflow-hidden">
        {/* Main Image */}
        <div 
          className="relative h-[320px] bg-[#0a0a0a] cursor-pointer hover:opacity-95 transition-opacity"
          onDoubleClick={() => openModal(0)}
        >
          <Image
            src={images[0]}
            alt={propertyTitle}
            fill
            className="object-cover"
            priority
          />

          {/* Image counter */}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
            1/{images.length}
          </div>

          {/* Hint text */}
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white/70 text-xs rounded-lg">
            Doble clic para expandir
          </div>
        </div>

        {/* Thumbnails */}
        <div className="p-4 bg-[#111] flex gap-3">
          {images.slice(1).map((img, index) => (
            <div
              key={index}
              className="relative w-20 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-colors cursor-pointer"
              onClick={() => openModal(index + 1)}
            >
              <Image
                src={img}
                alt={`Vista ${index + 2}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            aria-label="Cerrar"
          >
            <X size={24} className="text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg z-10">
            {selectedImageIndex + 1} / {images.length}
          </div>

          {/* Navigation arrows */}
          {selectedImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImageIndex(selectedImageIndex - 1)
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              aria-label="Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}

          {selectedImageIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImageIndex(selectedImageIndex + 1)
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              aria-label="Siguiente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}

          {/* Full Size Image */}
          <div 
            className="relative w-full h-full max-w-6xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedImageIndex]}
              alt={`${propertyTitle} - Vista ${selectedImageIndex + 1}`}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
