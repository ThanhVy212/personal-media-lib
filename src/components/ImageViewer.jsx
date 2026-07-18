import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, ChevronLeft, ChevronRight, Crop, Check, X } from 'lucide-react';

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

  // Cropping states
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [imageDims, setImageDims] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset zoom/pan/cropping when image changes
  useEffect(() => {
    handleReset();
    setIsCropping(false);
  }, [src]);

  const updateImageDims = () => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (img && container) {
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setImageDims({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height
      });
    }
  };

  useEffect(() => {
    if (isCropping) {
      updateImageDims();
      window.addEventListener('resize', updateImageDims);
      
      // Additional triggers to ensure image bounds are correct
      const timer1 = setTimeout(updateImageDims, 50);
      const timer2 = setTimeout(updateImageDims, 200);
      
      return () => {
        window.removeEventListener('resize', updateImageDims);
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isCropping, src]);

  // Bind mouse wheel zoom natively (React's synthetic onWheel is passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isCropping) return;

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
  }, [isCropping]);

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
    if (isCropping) return;
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
  }, [onPrev, onNext, hasPrev, hasNext, isCropping]);

  const handleZoomIn = () => {
    if (isCropping) return;
    setScale(prev => Math.min(prev + 0.25, 10));
  };

  const handleZoomOut = () => {
    if (isCropping) return;
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
    if (isCropping || scale <= 1) return; // Only allow panning when zoomed in
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (isCropping || !isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDragStart = (e, action) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...crop };

    const handleDragMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dxPercent = (dx / imageDims.width) * 100;
      const dyPercent = (dy / imageDims.height) * 100;

      let nextCrop = { ...startCrop };

      if (action === 'drag') {
        nextCrop.x = Math.max(0, Math.min(startCrop.x + dxPercent, 100 - startCrop.w));
        nextCrop.y = Math.max(0, Math.min(startCrop.y + dyPercent, 100 - startCrop.h));
      } else {
        const minW = 10;
        const minH = 10;

        if (action.includes('e')) {
          nextCrop.w = Math.max(minW, Math.min(startCrop.w + dxPercent, 100 - startCrop.x));
        }
        if (action.includes('w')) {
          const maxX = startCrop.x + startCrop.w - minW;
          nextCrop.x = Math.max(0, Math.min(startCrop.x + dxPercent, maxX));
          nextCrop.w = startCrop.x + startCrop.w - nextCrop.x;
        }
        if (action.includes('s')) {
          nextCrop.h = Math.max(minH, Math.min(startCrop.h + dyPercent, 100 - startCrop.y));
        }
        if (action.includes('n')) {
          const maxY = startCrop.y + startCrop.h - minH;
          nextCrop.y = Math.max(0, Math.min(startCrop.y + dyPercent, maxY));
          nextCrop.h = startCrop.y + startCrop.h - nextCrop.y;
        }
      }

      setCrop(nextCrop);
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleCropDownload = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const sx = (crop.x / 100) * naturalWidth;
    const sy = (crop.y / 100) * naturalHeight;
    const sw = (crop.w / 100) * naturalWidth;
    const sh = (crop.h / 100) * naturalHeight;

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const dotIndex = name.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
      link.download = `${baseName}-cropped.png`;
      link.href = dataUrl;
      link.click();
      setIsCropping(false);
    } catch (err) {
      console.error('Error cropping image:', err);
    }
  };

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
      {!isCropping && hasPrev && (
        <button className="nav-btn nav-btn-left" onClick={onPrev} aria-label="Previous image">
          <ChevronLeft size={28} />
        </button>
      )}

      {!isCropping && hasNext && (
        <button className="nav-btn nav-btn-right" onClick={onNext} aria-label="Next image">
          <ChevronRight size={28} />
        </button>
      )}

      {/* Primary Image Canvas */}
      <div 
        className="image-canvas"
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: isCropping ? 'default' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'),
          position: 'relative'
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={name}
          className="viewer-image"
          onDoubleClick={isCropping ? null : handleReset}
          onLoad={() => {
            if (isCropping) updateImageDims();
          }}
          style={{
            transform: isCropping ? 'none' : `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        />

        {isCropping && (
          <div 
            className="crop-overlay-wrapper"
            style={{
              left: `${imageDims.left}px`,
              top: `${imageDims.top}px`,
              width: `${imageDims.width}px`,
              height: `${imageDims.height}px`
            }}
          >
            <div 
              className="crop-box"
              onMouseDown={(e) => handleDragStart(e, 'drag')}
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`
              }}
            >
              {/* Grid Lines for Rule of Thirds */}
              <div className="crop-grid-line-h1"></div>
              <div className="crop-grid-line-h2"></div>
              <div className="crop-grid-line-v1"></div>
              <div className="crop-grid-line-v2"></div>

              {/* Corner handles (L-shaped) */}
              <div className="crop-handle-corner crop-handle-nw" onMouseDown={(e) => handleDragStart(e, 'nw')}></div>
              <div className="crop-handle-corner crop-handle-ne" onMouseDown={(e) => handleDragStart(e, 'ne')}></div>
              <div className="crop-handle-corner crop-handle-se" onMouseDown={(e) => handleDragStart(e, 'se')}></div>
              <div className="crop-handle-corner crop-handle-sw" onMouseDown={(e) => handleDragStart(e, 'sw')}></div>

              {/* Edge handles */}
              <div className="crop-handle-edge crop-handle-n" onMouseDown={(e) => handleDragStart(e, 'n')}></div>
              <div className="crop-handle-edge crop-handle-s" onMouseDown={(e) => handleDragStart(e, 's')}></div>
              <div className="crop-handle-edge crop-handle-w" onMouseDown={(e) => handleDragStart(e, 'w')}></div>
              <div className="crop-handle-edge crop-handle-e" onMouseDown={(e) => handleDragStart(e, 'e')}></div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      {isCropping ? (
        <div className="viewer-controls glassmorphism" style={{ opacity: 1, transform: 'translateY(0)', pointerEvents: 'auto' }}>
          <button className="btn btn-danger" onClick={() => setIsCropping(false)}>
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button className="btn btn-primary" onClick={handleCropDownload}>
            <Check size={16} />
            <span>Crop & Download</span>
          </button>
        </div>
      ) : (
        <div className="viewer-controls glassmorphism">
          <button 
            className="btn btn-icon btn-secondary" 
            onClick={() => {
              handleReset();
              setIsCropping(true);
              setCrop({ x: 15, y: 15, w: 70, h: 70 });
            }} 
            data-tooltip="Crop Image"
          >
            <Crop size={18} />
          </button>
          <div className="controls-separator"></div>
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
      )}

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

        /* Crop Overlay Styles */
        .crop-overlay-wrapper {
          position: absolute;
          pointer-events: none;
          z-index: 20;
        }

        .crop-box {
          position: absolute;
          border: 1px dashed rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
          box-sizing: border-box;
          pointer-events: auto;
          cursor: move;
        }

        .crop-grid-line-h1, .crop-grid-line-h2 {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
        }
        .crop-grid-line-h1 { top: 33.33%; }
        .crop-grid-line-h2 { top: 66.66%; }

        .crop-grid-line-v1, .crop-grid-line-v2 {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.3);
        }
        .crop-grid-line-v1 { left: 33.33%; }
        .crop-grid-line-v2 { left: 66.66%; }

        .crop-handle-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: #f1f5f9;
          border-style: solid;
          pointer-events: auto;
        }
        .crop-handle-nw { top: -3px; left: -3px; border-width: 3px 0 0 3px; cursor: nwse-resize; }
        .crop-handle-ne { top: -3px; right: -3px; border-width: 3px 3px 0 0; cursor: nesw-resize; }
        .crop-handle-se { bottom: -3px; right: -3px; border-width: 0 3px 3px 0; cursor: nwse-resize; }
        .crop-handle-sw { bottom: -3px; left: -3px; border-width: 0 0 3px 3px; cursor: nesw-resize; }

        .crop-handle-edge {
          position: absolute;
          pointer-events: auto;
        }
        .crop-handle-n { top: -3px; left: 16px; right: 16px; height: 6px; cursor: ns-resize; }
        .crop-handle-s { bottom: -3px; left: 16px; right: 16px; height: 6px; cursor: ns-resize; }
        .crop-handle-w { left: -3px; top: 16px; bottom: 16px; width: 6px; cursor: ew-resize; }
        .crop-handle-e { right: -3px; top: 16px; bottom: 16px; width: 6px; cursor: ew-resize; }
      `}</style>
    </div>
  );
}
