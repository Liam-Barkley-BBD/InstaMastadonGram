import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import type { MediaItem } from '../types/Post';
import './MediaViewer.css';

interface MediaViewerProps {
  mediaItems: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  mediaItems,
  currentIndex,
  isOpen,
  onClose,
  onNavigate
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate(currentIndex === 0 ? mediaItems.length - 1 : currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate(currentIndex === mediaItems.length - 1 ? 0 : currentIndex + 1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, mediaItems.length, onClose, onNavigate]);

  if (!isOpen) return null;

  const currentMedia = mediaItems[currentIndex];

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="media-viewer-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Navigation arrows */}
        {mediaItems.length > 1 && (
          <>
            <button 
              className="media-viewer-nav media-viewer-prev"
              onClick={() => onNavigate(currentIndex === 0 ? mediaItems.length - 1 : currentIndex - 1)}
            >
              <ChevronLeft size={32} />
            </button>
            <button 
              className="media-viewer-nav media-viewer-next"
              onClick={() => onNavigate(currentIndex === mediaItems.length - 1 ? 0 : currentIndex + 1)}
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        {/* Media content */}
        <div className="media-viewer-media">
          {currentMedia.type === 'image' ? (
            <img 
              src={currentMedia.url} 
              alt={`Media ${currentIndex + 1}`}
              className="media-viewer-image"
            />
          ) : (
            <div className="media-viewer-video-container">
              <video 
                src={currentMedia.url} 
                className="media-viewer-video"
                controls
                autoPlay
              />
            </div>
          )}
        </div>

        {/* Counter */}
        <div className="media-viewer-counter">
          {currentIndex + 1} / {mediaItems.length}
        </div>

        {/* Dots indicator */}
        {mediaItems.length > 1 && (
          <div className="media-viewer-dots">
            {mediaItems.map((_, index) => (
              <button
                key={index}
                className={`media-viewer-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => onNavigate(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer; 