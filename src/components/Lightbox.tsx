/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxPhoto {
  image_url: string;
  title?: string;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function Lightbox({ photos, initialIndex, isOpen, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Preload neighbor photos
    if (photos.length > 1) {
      const nextIdx = (index + 1) % photos.length;
      const prevIdx = (index - 1 + photos.length) % photos.length;
      [nextIdx, prevIdx].forEach(idx => {
        const img = new Image();
        img.src = photos[idx].image_url;
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, index, photos, onClose]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[index];

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image display */}
      <div className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center justify-center select-none">
        <img 
          src={currentPhoto.image_url} 
          alt={currentPhoto.title || ''} 
          className="max-w-full max-h-[75vh] object-contain rounded-md shadow-2xl border border-white/10 animate-scale-up"
        />

        {/* Caption */}
        <div className="mt-4 flex items-center justify-center gap-6 font-mono text-xs tracking-wider text-neutral-400">
          <span className="text-white/85 font-medium">{currentPhoto.title || 'Sem título'}</span>
          <span>
            {index + 1} / {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}
