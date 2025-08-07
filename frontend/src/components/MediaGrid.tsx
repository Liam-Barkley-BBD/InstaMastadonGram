import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { MediaItem } from '../types/Post';
import MediaViewer from './MediaViewer';
import './MediaGrid.css';

interface MediaGridProps {
  mediaItems: MediaItem[];
  postId: string;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaItems, postId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'Escape') {
      setIsFullscreen(false);
    }
  };

  // For 1-4 items, show grid layout
  if (mediaItems.length <= 4) {
    return (
      <>
        <div className={`media-grid media-grid-${mediaItems.length}`}>
          {mediaItems.map((item, index) => (
            <div 
              key={`${postId}-${index}`} 
              className="media-grid-item"
              onClick={() => {
                setCurrentIndex(index);
                setIsFullscreen(true);
              }}
            >
              {item.type === 'image' ? (
                <img 
                  src={item.url} 
                  alt={`Media ${index + 1}`}
                  className="media-grid-image"
                  loading="lazy"
                />
              ) : (
                <div className="media-grid-video-container">
                  <video 
                    src={item.url} 
                    className="media-grid-video"
                    preload="metadata"
                  />
                  <div className="media-grid-video-overlay">
                    <Play size={24} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <MediaViewer
          mediaItems={mediaItems}
          currentIndex={currentIndex}
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          onNavigate={setCurrentIndex}
        />
      </>
    );
  }

  // For more than 4 items, show carousel
  return (
    <>
      <div className="media-carousel" onKeyDown={handleKeyDown} tabIndex={0}>
        <div className="media-carousel-container">
          <div 
            className="media-carousel-item"
            onClick={() => setIsFullscreen(true)}
          >
            {mediaItems[currentIndex].type === 'image' ? (
              <img 
                src={mediaItems[currentIndex].url} 
                alt={`Media ${currentIndex + 1}`}
                className="media-carousel-image"
                loading="lazy"
              />
            ) : (
              <div className="media-carousel-video-container">
                <video 
                  src={mediaItems[currentIndex].url} 
                  className="media-carousel-video"
                  preload="metadata"
                />
                <div className="media-carousel-video-overlay">
                  <Play size={24} />
                </div>
              </div>
            )}
          </div>

          {/* Navigation arrows */}
          {mediaItems.length > 1 && (
            <>
              <button 
                className="media-carousel-nav media-carousel-prev"
                onClick={handlePrevious}
                aria-label="Previous media"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                className="media-carousel-nav media-carousel-next"
                onClick={handleNext}
                aria-label="Next media"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Dots indicator */}
          {mediaItems.length > 1 && (
            <div className="media-carousel-dots">
              {mediaItems.map((_, index) => (
                <button
                  key={index}
                  className={`media-carousel-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Counter */}
          <div className="media-carousel-counter">
            {currentIndex + 1} / {mediaItems.length}
          </div>
        </div>
      </div>
      
      <MediaViewer
        mediaItems={mediaItems}
        currentIndex={currentIndex}
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        onNavigate={setCurrentIndex}
      />
    </>
  );
};

export default MediaGrid; 