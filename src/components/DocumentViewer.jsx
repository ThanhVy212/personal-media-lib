import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  File,
  Maximize2,
  Minimize2,
} from "lucide-react";

export default function DocumentViewer({
  src,
  name,
  file,
  mimeType,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const isPdf = mimeType === "application/pdf" || name?.toLowerCase().endsWith(".pdf");
  const isTxt = mimeType === "text/plain" || name?.toLowerCase().endsWith(".txt");
  const isDoc =
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name?.toLowerCase().endsWith(".doc") ||
    name?.toLowerCase().endsWith(".docx");

  useEffect(() => {
    if (isTxt && file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target.result);
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read text file");
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setLoading(false);
    }
  }, [file, isTxt]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
      if (e.key === "Escape" && isFullscreen) toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrev, hasNext, onPrev, onNext, isFullscreen]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 20, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 20, 40));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDocPreview = () => {
    if (isPdf) {
      return (
        <iframe
          src={src}
          title={name}
          className="document-iframe"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        />
      );
    }

    if (isTxt) {
      return (
        <div
          className="document-text-content"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "top left",
          }}
        >
          <pre>{textContent}</pre>
        </div>
      );
    }

    if (isDoc) {
      return (
        <div className="document-doc-container">
          <div className="document-doc-notice glassmorphism">
            <File size={48} className="doc-icon" />
            <h3>{name}</h3>
            <p>
              Word documents are displayed as embedded preview.
              <br />
              For best experience, download the file.
            </p>
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download size={16} />
              <span>Download File</span>
            </button>
          </div>
          <iframe
            src={src}
            title={name}
            className="document-iframe"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`document-viewer-container ${isFullscreen ? "fullscreen" : ""}`}
    >
      <div className="document-title-overlay">
        <FileText size={18} />
        <span>{name}</span>
      </div>

      <div className="document-content-wrapper">
        {loading ? (
          <div className="document-loading">
            <div className="document-loading-spinner"></div>
            <span>Loading document...</span>
          </div>
        ) : error ? (
          <div className="document-error">
            <FileText size={48} />
            <p>{error}</p>
          </div>
        ) : (
          renderDocPreview()
        )}
      </div>

      <div className="document-controls glassmorphism">
        <div className="document-controls-left">
          {hasPrev && (
            <button className="btn btn-secondary" onClick={onPrev}>
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        <div className="document-controls-center">
          <button
            className="btn btn-secondary"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="document-zoom-level">{zoom}%</span>
          <button
            className="btn btn-secondary"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRotate}
            title="Rotate"
          >
            <RotateCw size={16} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 size={16} />
            ) : (
              <Maximize2 size={16} />
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownload}
            title="Download"
          >
            <Download size={16} />
          </button>
        </div>

        <div className="document-controls-right">
          {hasNext && (
            <button className="btn btn-secondary" onClick={onNext}>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
