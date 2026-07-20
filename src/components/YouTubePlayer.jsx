import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, ExternalLink } from "lucide-react";

export default function YouTubePlayer({
  videoId,
  name,
  watchUrl,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, hasPrev, hasNext]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;

  return (
    <div ref={containerRef} className="youtube-player-container">
      <div className="viewer-title-overlay">
        <span>{name}</span>
      </div>

      {hasPrev && (
        <button className="nav-btn nav-btn-left" onClick={onPrev} aria-label="Previous">
          <ChevronLeft size={28} />
        </button>
      )}
      {hasNext && (
        <button className="nav-btn nav-btn-right" onClick={onNext} aria-label="Next">
          <ChevronRight size={28} />
        </button>
      )}

      <div className="youtube-embed-wrap">
        <iframe
          title={name}
          src={embedSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="youtube-iframe"
        />
      </div>

      <div className="viewer-controls glassmorphism youtube-controls">
        <a
          className="btn btn-secondary"
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          <span>Open on YouTube</span>
        </a>
        <button
          className="btn btn-icon btn-secondary"
          onClick={toggleFullscreen}
          data-tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}
