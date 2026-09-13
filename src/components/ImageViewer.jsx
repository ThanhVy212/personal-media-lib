import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Crop,
  Check,
  X,
  Download,
  Sliders,
  Heart,
  Info,
} from "lucide-react";
import { extractExif } from "../utils/exifParser.js";

export default function ImageViewer({
  src,
  name,
  file,
  mimeType,
  isFavorite,
  onToggleFavorite,
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

  // Watermarking states
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [watermarkType, setWatermarkType] = useState("text"); // 'text' or 'logo'
  const [watermarkText, setWatermarkText] = useState("© ThanhVy212");
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState(null);
  const [watermarkColor, setWatermarkColor] = useState("#ffffff");
  const [watermarkSize, setWatermarkSize] = useState(24);
  const [watermarkScale, setWatermarkScale] = useState(15); // logo scale in %
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.6);
  const [watermarkPos, setWatermarkPos] = useState("bottom-right"); // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'

  // Rotation & flip states
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // EXIF metadata
  const [showMetadata, setShowMetadata] = useState(false);
  const [exifData, setExifData] = useState(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [metaDims, setMetaDims] = useState(null);
  const isImage = mimeType && mimeType.startsWith("image/");

  useEffect(() => {
    setExifData(null);
    setShowMetadata(false);
    setExifLoading(false);
    setMetaDims(null);
    if (file && isImage) {
      let stale = false;
      setExifLoading(true);
      extractExif(file)
        .then((data) => { if (!stale) setExifData(data); })
        .catch(() => {})
        .finally(() => { if (!stale) setExifLoading(false); });
      return () => { stale = true; };
    }
  }, [file, mimeType, src, isImage]);

  const handleImageMetaLoad = (e) => {
    const img = e.target;
    setMetaDims({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]} (${bytes.toLocaleString()} bytes)`;
  };

  const getFileExtension = (filename) => {
    if (!filename) return "";
    const dot = filename.lastIndexOf(".");
    return dot !== -1 ? filename.substring(dot + 1).toUpperCase() : "";
  };

  const getMimeLabel = (mime) => {
    if (!mime) return "Unknown";
    const map = {
      "image/jpeg": "JPEG Image",
      "image/png": "PNG Image",
      "image/gif": "GIF Image",
      "image/webp": "WebP Image",
      "image/svg+xml": "SVG Image",
      "image/bmp": "BMP Image",
      "image/tiff": "TIFF Image",
      "video/mp4": "MP4 Video",
      "video/webm": "WebM Video",
      "video/quicktime": "MOV Video",
      "audio/mpeg": "MP3 Audio",
      "audio/wav": "WAV Audio",
      "audio/ogg": "OGG Audio",
      "application/pdf": "PDF Document",
      "text/plain": "Text Document",
    };
    return map[mime] || mime;
  };

  const handleExportWatermarkedImage = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw base image
    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

    // Apply global alpha for watermark
    ctx.globalAlpha = watermarkOpacity;

    if (watermarkType === "text") {
      ctx.fillStyle = watermarkColor;
      // Setup font size relative to image resolution
      const relativeSize = watermarkSize; 
      ctx.font = `${relativeSize}px Inter, sans-serif`;
      ctx.textBaseline = "middle";

      const textWidth = ctx.measureText(watermarkText).width;
      const textHeight = relativeSize;

      let x = 20;
      let y = 20;

      if (watermarkPos === "top-left") {
        x = 40;
        y = 40 + textHeight / 2;
      } else if (watermarkPos === "top-right") {
        x = naturalWidth - textWidth - 40;
        y = 40 + textHeight / 2;
      } else if (watermarkPos === "bottom-left") {
        x = 40;
        y = naturalHeight - textHeight / 2 - 40;
      } else if (watermarkPos === "bottom-right") {
        x = naturalWidth - textWidth - 40;
        y = naturalHeight - textHeight / 2 - 40;
      } else if (watermarkPos === "center") {
        x = (naturalWidth - textWidth) / 2;
        y = naturalHeight / 2;
      }

      ctx.fillText(watermarkText, x, y);
      downloadCanvas();
    } else if (watermarkType === "logo" && watermarkLogoUrl) {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = watermarkLogoUrl;
      logoImg.onload = () => {
        const logoWidth = naturalWidth * (watermarkScale / 100);
        const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;

        let x = 20;
        let y = 20;

        if (watermarkPos === "top-left") {
          x = 40;
          y = 40;
        } else if (watermarkPos === "top-right") {
          x = naturalWidth - logoWidth - 40;
          y = 40;
        } else if (watermarkPos === "bottom-left") {
          x = 40;
          y = naturalHeight - logoHeight - 40;
        } else if (watermarkPos === "bottom-right") {
          x = naturalWidth - logoWidth - 40;
          y = naturalHeight - logoHeight - 40;
        } else if (watermarkPos === "center") {
          x = (naturalWidth - logoWidth) / 2;
          y = (naturalHeight - logoHeight) / 2;
        }

        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
        downloadCanvas();
      };
      logoImg.onerror = () => {
        onToast?.("Không thể tải ảnh logo.", "info");
      };
      return;
    } else {
      downloadCanvas();
    }

    function downloadCanvas() {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        const dotIndex = name.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
        link.download = `${baseName}-watermarked.png`;
        link.href = dataUrl;
        link.click();
        setIsWatermarking(false);
        onToast?.("Đã xuất ảnh có watermark thành công!", "success");
      } catch (err) {
        console.error("Error watermarking image:", err);
        onToast?.("Không thể xuất ảnh do lỗi bảo mật (CORS).", "info");
      }
    }
  };

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
    setIsWatermarking(false);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setShowMetadata(false);
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
  }, [isCropping, src, updateImageDims]);

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

  const imageTransformStyle = isCropping
    ? undefined
    : {
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
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
                onLoad={handleImageMetaLoad}
              />
              {isWatermarking && (
                <div
                  className={`watermark-preview-overlay pos-${watermarkPos}`}
                  style={{
                    opacity: watermarkOpacity,
                    color: watermarkColor,
                    fontSize: `${watermarkSize}px`,
                  }}
                >
                  {watermarkType === "text" ? (
                    <span>{watermarkText || "Watermark"}</span>
                  ) : (
                    watermarkLogoUrl && (
                      <img
                        src={watermarkLogoUrl}
                        alt="Watermark Logo"
                        style={{ width: `${watermarkScale * 10}px`, maxWidth: "50%" }}
                      />
                    )
                  )}
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
          <button
            className={`btn btn-icon btn-secondary ${isWatermarking ? "btn-active-translate" : ""}`}
            onClick={() => {
              setIsWatermarking(!isWatermarking);
              setIsCropping(false);
            }}
            data-tooltip="Thêm Watermark"
          >
            <Sliders size={18} />
          </button>
          <button
            className={`btn btn-icon btn-secondary ${isFavorite ? "btn-fav-active" : ""}`}
            onClick={onToggleFavorite}
            data-tooltip={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <div className="controls-separator"></div>
          <button
            className="btn btn-icon btn-secondary"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            data-tooltip="Rotate Right"
          >
            <RotateCw size={18} />
          </button>
          <button
            className="btn btn-icon btn-secondary"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            data-tooltip="Rotate Left"
          >
            <RotateCcw size={18} />
          </button>
          <button
            className={`btn btn-icon btn-secondary ${flipH ? "btn-active-tab" : ""}`}
            onClick={() => setFlipH((v) => !v)}
            data-tooltip="Flip Horizontal"
          >
            <FlipHorizontal size={18} />
          </button>
          <button
            className={`btn btn-icon btn-secondary ${flipV ? "btn-active-tab" : ""}`}
            onClick={() => setFlipV((v) => !v)}
            data-tooltip="Flip Vertical"
          >
            <FlipVertical size={18} />
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
          {isImage && (
            <button
              className={`btn btn-icon btn-secondary ${showMetadata ? "btn-active-tab" : ""}`}
              onClick={() => setShowMetadata((v) => !v)}
              data-tooltip="EXIF Metadata"
            >
              <Info size={18} />
            </button>
          )}
          <div className="controls-separator"></div>
        </div>
      )}

      {isWatermarking && (
        <div className="watermark-sidebar glassmorphism animate-fade-in">
          <div className="watermark-sidebar-header">
            <h4>Cấu hình Watermark</h4>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setIsWatermarking(false)}>
              <X size={14} />
            </button>
          </div>
          
          <div className="watermark-sidebar-content">
            <div className="form-group">
              <label>Loại Watermark:</label>
              <div className="watermark-type-row">
                <button
                  className={`btn btn-secondary btn-sm flex-1 ${watermarkType === "text" ? "btn-active-tab" : ""}`}
                  onClick={() => setWatermarkType("text")}
                >
                  Chữ (Text)
                </button>
                <button
                  className={`btn btn-secondary btn-sm flex-1 ${watermarkType === "logo" ? "btn-active-tab" : ""}`}
                  onClick={() => setWatermarkType("logo")}
                >
                  Logo (Ảnh)
                </button>
              </div>
            </div>

            {watermarkType === "text" ? (
              <>
                <div className="form-group">
                  <label>Nội dung chữ:</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="watermark-input"
                  />
                </div>
                <div className="form-group">
                  <label>Màu chữ:</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="watermark-color-picker"
                    />
                    <input
                      type="text"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="watermark-input font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Kích thước ({watermarkSize}px):</label>
                  <input
                    type="range"
                    min="12"
                    max="100"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Tải ảnh logo lên:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setWatermarkLogoUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="watermark-file-input"
                  />
                  {watermarkLogoUrl && (
                    <div className="logo-preview-box">
                      <img src={watermarkLogoUrl} alt="Logo" className="logo-preview-img" />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Tỉ lệ logo ({watermarkScale}%):</label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Độ mờ ({Math.round(watermarkOpacity * 100)}%):</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="custom-slider"
              />
            </div>

            <div className="form-group">
              <label>Vị trí:</label>
              <select
                value={watermarkPos}
                onChange={(e) => setWatermarkPos(e.target.value)}
                className="watermark-select"
              >
                <option value="top-left">Trên - Trái</option>
                <option value="top-right">Trên - Phải</option>
                <option value="bottom-left">Dưới - Trái</option>
                <option value="bottom-right">Dưới - Phải</option>
                <option value="center">Ở giữa</option>
              </select>
            </div>
          </div>

          <div className="watermark-sidebar-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => setIsWatermarking(false)}>
              Huỷ
            </button>
            <button className="btn btn-primary btn-sm flex-1" onClick={handleExportWatermarkedImage}>
              <Download size={14} />
              <span>Xuất & Tải về</span>
            </button>
          </div>
        </div>
      )}

      {showMetadata && (
        <div className="metadata-panel glassmorphism animate-fade-in">
          <div className="metadata-panel-header">
            <h4>{name}</h4>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setShowMetadata(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="metadata-panel-content">
            <div className="metadata-section">
              <div className="metadata-section-title">General</div>
              <div className="metadata-row">
                <span className="metadata-label">Type of file:</span>
                <span className="metadata-value">{getMimeLabel(mimeType)} (.{getFileExtension(name)})</span>
              </div>
              {file && (
                <div className="metadata-row">
                  <span className="metadata-label">Opens with:</span>
                  <span className="metadata-value">Browser</span>
                </div>
              )}
              {isImage && metaDims && (
                <div className="metadata-row">
                  <span className="metadata-label">Dimensions:</span>
                  <span className="metadata-value">{metaDims.width} x {metaDims.height} pixels</span>
                </div>
              )}
              {file && (
                <div className="metadata-row">
                  <span className="metadata-label">Size:</span>
                  <span className="metadata-value">{formatSize(file.size)}</span>
                </div>
              )}
              {file && file.lastModified && (
                <div className="metadata-row">
                  <span className="metadata-label">Modified:</span>
                  <span className="metadata-value">{new Date(file.lastModified).toLocaleString()}</span>
                </div>
              )}
            </div>

            {exifLoading && (
              <div className="metadata-section">
                <div className="metadata-section-title">EXIF</div>
                <div className="metadata-row">
                  <span className="metadata-value" style={{ fontStyle: "italic" }}>Loading...</span>
                </div>
              </div>
            )}

            {!exifLoading && exifData && (
              <div className="metadata-section">
                <div className="metadata-section-title">Details (EXIF)</div>
                {exifData.cameraMake && (
                  <div className="metadata-row">
                    <span className="metadata-label">Camera:</span>
                    <span className="metadata-value">{exifData.cameraMake} {exifData.cameraModel || ""}</span>
                  </div>
                )}
                {exifData.lensModel && (
                  <div className="metadata-row">
                    <span className="metadata-label">Lens:</span>
                    <span className="metadata-value">{exifData.lensModel}</span>
                  </div>
                )}
                {exifData.dateOriginal && (
                  <div className="metadata-row">
                    <span className="metadata-label">Date taken:</span>
                    <span className="metadata-value">{exifData.dateOriginal}</span>
                  </div>
                )}
                {exifData.exposureTime && (
                  <div className="metadata-row">
                    <span className="metadata-label">Exposure:</span>
                    <span className="metadata-value">{exifData.exposureTime} | {exifData.fNumber} | ISO {exifData.iso}</span>
                  </div>
                )}
                {exifData.focalLength && (
                  <div className="metadata-row">
                    <span className="metadata-label">Focal length:</span>
                    <span className="metadata-value">{exifData.focalLength} {exifData.focalLength35mm ? `(${exifData.focalLength35mm})` : ""}</span>
                  </div>
                )}
                {exifData.orientation && (
                  <div className="metadata-row">
                    <span className="metadata-label">Orientation:</span>
                    <span className="metadata-value">{exifData.orientation}</span>
                  </div>
                )}
                {exifData.flash && (
                  <div className="metadata-row">
                    <span className="metadata-label">Flash:</span>
                    <span className="metadata-value">{exifData.flash}</span>
                  </div>
                )}
                {exifData.software && (
                  <div className="metadata-row">
                    <span className="metadata-label">Software:</span>
                    <span className="metadata-value">{exifData.software}</span>
                  </div>
                )}
                {exifData.gps && (
                  <div className="metadata-row">
                    <span className="metadata-label">GPS:</span>
                    <span className="metadata-value">
                      {exifData.gps.lat}, {exifData.gps.lng}
                      <a href={exifData.gps.url} target="_blank" rel="noopener noreferrer" className="gps-link">
                        View Map
                      </a>
                    </span>
                  </div>
                )}
                {exifData.gpsAltitude && (
                  <div className="metadata-row">
                    <span className="metadata-label">Altitude:</span>
                    <span className="metadata-value">{exifData.gpsAltitude}</span>
                  </div>
                )}
              </div>
            )}

            {!exifLoading && !exifData && isImage && (
              <div className="metadata-section">
                <div className="metadata-section-title">Details (EXIF)</div>
                <div className="metadata-row metadata-empty">
                  <span className="metadata-value">No EXIF data found.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
