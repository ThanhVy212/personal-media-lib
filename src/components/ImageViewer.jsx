import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageViewer({ 
  src, 
  name, 
  onPrev, 
  onNext,
  hasPrev,
  hasNext
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset zoom/pan when image changes
  useEffect(() => {
    handleReset();
  }, [src]);

  // Bind mouse wheel zoom natively (React's synthetic onWheel is passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomStep = 0.1;
      setScale((prevScale) => {
        let nextScale = prevScale + (e.deltaY < 0 ? zoomStep : -zoomStep);
        nextScale = Math.max(0.2, Math.min(nextScale, 10)); // Clamp between 0.2x and 10x
        if (nextScale === 1) {
          setOffset({ x: 0, y: 0 });
        }
        return nextScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Listen to Fullscreen API change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation inside image viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext();
      } else if (e.key === 'Escape') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, hasPrev, hasNext]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 10));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.2);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return; // Only allow panning when zoomed in
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert scale to percentage display
  const scalePercent = Math.round(scale * 100);

  return (
    <div 
      ref={containerRef} 
      className="image-viewer-container no-select"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Banner overlay (displays title in fullscreen) */}
      <div className="viewer-title-overlay">
        <span>{name}</span>
      </div>

      {/* Navigations */}
      {hasPrev && (
        <button className="nav-btn nav-btn-left" onClick={onPrev} aria-label="Previous image">
          <ChevronLeft size={28} />
        </button>
      )}

      {hasNext && (
        <button className="nav-btn nav-btn-right" onClick={onNext} aria-label="Next image">
          <ChevronRight size={28} />
        </button>
      )}

      {/* Primary Image Canvas */}
      <div 
        className="image-canvas"
        onMouseDown={handleMouseDown}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={name}
          className="viewer-image"
          onDoubleClick={handleReset}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        />
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="viewer-controls glassmorphism">
        <button className="btn btn-icon btn-secondary" onClick={handleZoomOut} data-tooltip="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <span className="scale-display" onClick={handleReset} title="Double click image to reset">
          {scalePercent}%
        </span>
        <button className="btn btn-icon btn-secondary" onClick={handleZoomIn} data-tooltip="Zoom In">
          <ZoomIn size={18} />
        </button>
        <div className="controls-separator"></div>
        <button className="btn btn-icon btn-secondary" onClick={handleReset} data-tooltip="Reset Zoom">
          <RotateCcw size={18} />
        </button>
        <button className="btn btn-icon btn-secondary" onClick={toggleFullscreen} data-tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      <style>{`
        .image-viewer-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #050608;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .image-canvas {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .viewer-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transform-origin: center center;
          user-select: none;
          -webkit-user-drag: none;
        }

        .viewer-title-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px 24px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          z-index: 10;
          text-align: center;
        }

        .image-viewer-container:hover .viewer-title-overlay {
          opacity: 1;
        }

        /* Floating Nav Buttons */
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(24, 27, 40, 0.4);
          border: 1px solid var(--border);
          color: var(--text-primary);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10;
          opacity: 0;
        }

        .image-viewer-container:hover .nav-btn {
          opacity: 0.7;
        }

        .nav-btn:hover {
          opacity: 1 !important;
          background: rgba(124, 58, 237, 0.6);
          border-color: var(--primary);
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 0 15px rgba(124, 58, 237, 0.3);
        }

        .nav-btn-left {
          left: 24px;
        }

        .nav-btn-right {
          right: 24px;
        }

        /* Toolbar overlay */
        .viewer-controls {
          position: absolute;
          bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 9999px;
          box-shadow: var(--shadow-lg);
          z-index: 10;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s, transform 0.3s;
        }

        .image-viewer-container:hover .viewer-controls {
          opacity: 1;
          transform: translateY(0);
        }

        .scale-display {
          font-size: 0.85rem;
          font-weight: 600;
          min-width: 50px;
          text-align: center;
          color: var(--text-primary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: var(--transition-smooth);
        }

        .scale-display:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .controls-separator {
          width: 1px;
          height: 20px;
          background: var(--border);
        }

        /* Custom Fullscreen API tweaks */
        .image-viewer-container:fullscreen {
          width: 100vw;
          height: 100vh;
          background: #000;
        }

        .image-viewer-container:fullscreen .viewer-title-overlay {
          opacity: 1;
        }

        .image-viewer-container:fullscreen .viewer-controls {
          bottom: 40px;
        }
      `}</style>
    </div>
  );
}
