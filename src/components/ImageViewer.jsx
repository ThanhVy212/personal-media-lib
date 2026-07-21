import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Crop,
  Check,
  X,
  Languages,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import {
  translateImageRegions,
  getOpenAiApiKey,
} from "../utils/openaiTranslate.js";
import TranslateApiKeyModal from "./TranslateApiKeyModal.jsx";

export default function ImageViewer({
  src,
  name,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onToast,
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cropping states
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [imageDims, setImageDims] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [translationRegions, setTranslationRegions] = useState([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const updateImageDims = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (img && container) {
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setImageDims({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height,
      });
    }
  }, []);

  // Reset zoom/pan/cropping when image changes
  useEffect(() => {
    handleReset();
    setIsCropping(false);
    setTranslationRegions([]);
    setShowTranslation(false);
  }, [src]);

  useEffect(() => {
    if (isCropping) {
      updateImageDims();
      window.addEventListener("resize", updateImageDims);

      // Additional triggers to ensure image bounds are correct
      const timer1 = setTimeout(updateImageDims, 50);
      const timer2 = setTimeout(updateImageDims, 200);

      return () => {
        window.removeEventListener("resize", updateImageDims);
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

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isCropping]);

  // Prevent page scroll while panning zoomed image on touch
  useEffect(() => {
    const container = containerRef.current;

    const handleTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        e.preventDefault();
      }
    };

    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    return () => container.removeEventListener("touchmove", handleTouchMove);
  }, [isDragging, isCropping]);

  // Listen to Fullscreen API change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation inside image viewer
  useEffect(() => {
    if (isCropping) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
      } else if (e.key === "Escape") {
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, hasPrev, hasNext, isCropping]);

  const handleZoomIn = () => {
    if (isCropping) return;
    setScale((prev) => Math.min(prev + 0.25, 10));
  };

  const handleZoomOut = () => {
    if (isCropping) return;
    setScale((prev) => {
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
    if (isCropping) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleTouchStartPan = (e) => {
    if (isCropping || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (isCropping || !isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleTouchMovePan = (e) => {
    if (isCropping || !isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPointerCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = (e, action) => {
    e.preventDefault();
    e.stopPropagation();

    const startCoords = getPointerCoords(e);
    const startX = startCoords.x;
    const startY = startCoords.y;
    const startCrop = { ...crop };

    const handleDragMove = (moveEvent) => {
      const coords = getPointerCoords(moveEvent);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      const dxPercent = (dx / imageDims.width) * 100;
      const dyPercent = (dy / imageDims.height) * 100;

      let nextCrop = { ...startCrop };

      if (action === "drag") {
        nextCrop.x = Math.max(
          0,
          Math.min(startCrop.x + dxPercent, 100 - startCrop.w),
        );
        nextCrop.y = Math.max(
          0,
          Math.min(startCrop.y + dyPercent, 100 - startCrop.h),
        );
      } else {
        const minW = 10;
        const minH = 10;

        if (action.includes("e")) {
          nextCrop.w = Math.max(
            minW,
            Math.min(startCrop.w + dxPercent, 100 - startCrop.x),
          );
        }
        if (action.includes("w")) {
          const maxX = startCrop.x + startCrop.w - minW;
          nextCrop.x = Math.max(0, Math.min(startCrop.x + dxPercent, maxX));
          nextCrop.w = startCrop.x + startCrop.w - nextCrop.x;
        }
        if (action.includes("s")) {
          nextCrop.h = Math.max(
            minH,
            Math.min(startCrop.h + dyPercent, 100 - startCrop.y),
          );
        }
        if (action.includes("n")) {
          const maxY = startCrop.y + startCrop.h - minH;
          nextCrop.y = Math.max(0, Math.min(startCrop.y + dyPercent, maxY));
          nextCrop.h = startCrop.y + startCrop.h - nextCrop.y;
        }
      }

      setCrop(nextCrop);
    };

    const handleDragEnd = () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);
  };

  const handleCropDownload = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const sx = (crop.x / 100) * naturalWidth;
    const sy = (crop.y / 100) * naturalHeight;
    const sw = (crop.w / 100) * naturalWidth;
    const sh = (crop.h / 100) * naturalHeight;

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dotIndex = name.lastIndexOf(".");
      const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
      link.download = `${baseName}-cropped.png`;
      link.href = dataUrl;
      link.click();
      setIsCropping(false);
    } catch (err) {
      console.error("Error cropping image:", err);
    }
  };

  const scalePercent = Math.round(scale * 100);

  const runTranslate = async () => {
    if (!getOpenAiApiKey()) {
      setShowApiKeyModal(true);
      return;
    }
    setIsTranslating(true);
    try {
      const regions = await translateImageRegions(src);
      setTranslationRegions(regions);
      setShowTranslation(regions.length > 0);
      if (regions.length === 0) {
        onToast?.("Không tìm thấy chữ để dịch trên ảnh này.", "info");
      } else {
        onToast?.(
          `Đã dịch ${regions.length} vùng chữ sang tiếng Việt.`,
          "success",
        );
      }
    } catch (err) {
      if (err.message === "MISSING_API_KEY") {
        setShowApiKeyModal(true);
      } else {
        onToast?.(err.message || "Dịch thất bại.", "info");
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const imageTransformStyle = isCropping
    ? undefined
    : {
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transition: isDragging
          ? "none"
          : "transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)",
      };

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
        <button
          className="nav-btn nav-btn-left"
          onClick={onPrev}
          aria-label="Previous image"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {!isCropping && hasNext && (
        <button
          className="nav-btn nav-btn-right"
          onClick={onNext}
          aria-label="Next image"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Primary Image Canvas */}
      <div
        className="image-canvas"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStartPan}
        onTouchMove={handleTouchMovePan}
        onTouchEnd={handleMouseUp}
        style={{
          cursor: isCropping
            ? "default"
            : isDragging
              ? "grabbing"
              : "grab",
          position: "relative",
        }}
      >
        {isCropping ? (
          <img
            ref={imageRef}
            src={src}
            alt={name}
            className="viewer-image"
            onLoad={updateImageDims}
            style={{ transform: "none" }}
          />
        ) : (
          <div className="image-transform-layer" style={imageTransformStyle}>
            <div className="image-stack">
              <img
                ref={imageRef}
                src={src}
                alt={name}
                className="viewer-image"
                onDoubleClick={handleReset}
              />
              {showTranslation && translationRegions.length > 0 && (
                <div className="translation-overlay-layer">
                  {translationRegions.map((region, index) => (
                    <div
                      key={`${region.x}-${region.y}-${index}`}
                      className="translation-bubble"
                      style={{
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`,
                      }}
                    >
                      <span className="translation-bubble-text">
                        {region.translated}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isCropping && (
          <div
            className="crop-overlay-wrapper"
            style={{
              left: `${imageDims.left}px`,
              top: `${imageDims.top}px`,
              width: `${imageDims.width}px`,
              height: `${imageDims.height}px`,
            }}
          >
            <div
              className="crop-box"
              onMouseDown={(e) => handleDragStart(e, "drag")}
              onTouchStart={(e) => handleDragStart(e, "drag")}
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`,
              }}
            >
              {/* Grid Lines for Rule of Thirds */}
              <div className="crop-grid-line-h1"></div>
              <div className="crop-grid-line-h2"></div>
              <div className="crop-grid-line-v1"></div>
              <div className="crop-grid-line-v2"></div>

              {/* Corner handles (L-shaped) */}
              <div
                className="crop-handle-corner crop-handle-nw"
                onMouseDown={(e) => handleDragStart(e, "nw")}
                onTouchStart={(e) => handleDragStart(e, "nw")}
              ></div>
              <div
                className="crop-handle-corner crop-handle-ne"
                onMouseDown={(e) => handleDragStart(e, "ne")}
                onTouchStart={(e) => handleDragStart(e, "ne")}
              ></div>
              <div
                className="crop-handle-corner crop-handle-se"
                onMouseDown={(e) => handleDragStart(e, "se")}
                onTouchStart={(e) => handleDragStart(e, "se")}
              ></div>
              <div
                className="crop-handle-corner crop-handle-sw"
                onMouseDown={(e) => handleDragStart(e, "sw")}
                onTouchStart={(e) => handleDragStart(e, "sw")}
              ></div>

              {/* Edge handles */}
              <div
                className="crop-handle-edge crop-handle-n"
                onMouseDown={(e) => handleDragStart(e, "n")}
                onTouchStart={(e) => handleDragStart(e, "n")}
              ></div>
              <div
                className="crop-handle-edge crop-handle-s"
                onMouseDown={(e) => handleDragStart(e, "s")}
                onTouchStart={(e) => handleDragStart(e, "s")}
              ></div>
              <div
                className="crop-handle-edge crop-handle-w"
                onMouseDown={(e) => handleDragStart(e, "w")}
                onTouchStart={(e) => handleDragStart(e, "w")}
              ></div>
              <div
                className="crop-handle-edge crop-handle-e"
                onMouseDown={(e) => handleDragStart(e, "e")}
                onTouchStart={(e) => handleDragStart(e, "e")}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      {isCropping ? (
        <div
          className="viewer-controls glassmorphism"
          style={{
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          }}
        >
          <button
            className="btn btn-danger"
            onClick={() => setIsCropping(false)}
          >
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
          handleZoomOut
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
          <button
            className="btn btn-icon btn-secondary"
            onClick={handleZoomOut}
            data-tooltip="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span
            className="scale-display"
            onClick={handleReset}
            title="Double click image to reset"
          >
            {scalePercent}%
          </span>
          <button
            className="btn btn-icon btn-secondary"
            onClick={handleZoomIn}
            data-tooltip="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <div className="controls-separator"></div>
          <button
            className="btn btn-icon btn-secondary"
            onClick={handleReset}
            data-tooltip="Reset Zoom"
          >
            <RotateCcw size={18} />
          </button>
          <button
            className="btn btn-icon btn-secondary"
            onClick={toggleFullscreen}
            data-tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <div className="controls-separator"></div>
          <button
            className="btn btn-icon btn-secondary"
            onClick={() => setShowApiKeyModal(true)}
            data-tooltip="OpenAI API key"
          >
            <KeyRound size={18} />
          </button>
          {translationRegions.length > 0 && (
            <button
              className={`btn btn-icon btn-secondary ${showTranslation ? "btn-active-translate" : ""}`}
              onClick={() => setShowTranslation((v) => !v)}
              data-tooltip={showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
            >
              {showTranslation ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          <button
            className="btn btn-primary translate-action-btn"
            onClick={runTranslate}
            disabled={isTranslating}
            data-tooltip="Dịch chữ trên ảnh (EN → VI)"
          >
            {isTranslating ? (
              <Loader2 size={18} className="spin-icon" />
            ) : (
              <Languages size={18} />
            )}
            <span>{isTranslating ? "Đang dịch…" : "Dịch"}</span>
          </button>
        </div>
      )}

      {showApiKeyModal && (
        <TranslateApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSaved={() => onToast?.("Đã lưu API key.", "success")}
        />
      )}
    </div>
  );
}
