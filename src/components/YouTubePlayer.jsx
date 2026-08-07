import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, ExternalLink, X } from "lucide-react";

// Global script load manager
if (!window.youtubeAPIReadyCallbacks) {
  window.youtubeAPIReadyCallbacks = [];
  window.onYouTubeIframeAPIReady = () => {
    window.youtubeAPIReadyCallbacks.forEach((cb) => cb());
  };
}

const loadYouTubeAPI = (callback) => {
  if (window.YT && window.YT.Player) {
    callback();
    return;
  }
  window.youtubeAPIReadyCallbacks.push(callback);

  if (!document.getElementById("youtube-iframe-api-script")) {
    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api-script";
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }
};

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
  const playerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is writing in inputs
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, hasPrev, hasNext]);

  // Instantiate YouTube Player
  useEffect(() => {
    let player = null;
    let isUnmounted = false;
    lastSavedTimeRef.current = 0;
    setIsPlaying(false);

    loadYouTubeAPI(() => {
      if (isUnmounted) return;

      player = new window.YT.Player(`youtube-player-${videoId}`, {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;

            // Check progress
            const saved = localStorage.getItem(`youtube-progress:${videoId}`);
            if (saved) {
              const time = parseFloat(saved);
              const duration = event.target.getDuration();
              if (time > 2 && duration && time < duration - 2) {
                setSavedTime(time);
                setShowResumeDialog(true);
              }
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              localStorage.removeItem(`youtube-progress:${videoId}`);
            }
          },
        },
      });
    });

    return () => {
      isUnmounted = true;
      if (player && typeof player.destroy === "function") {
        player.destroy();
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Progress saver interval
  useEffect(() => {
    let intervalId;
    if (isPlaying && playerRef.current) {
      intervalId = setInterval(() => {
        const player = playerRef.current;
        if (player && typeof player.getCurrentTime === "function") {
          const time = player.getCurrentTime();
          const duration = player.getDuration();

          const rounded = Math.floor(time);
          if (rounded !== lastSavedTimeRef.current) {
            lastSavedTimeRef.current = rounded;
            if (time > 2 && duration > 0 && time < duration - 2) {
              localStorage.setItem(`youtube-progress:${videoId}`, time.toString());
            } else if (duration > 0 && (time >= duration - 2 || time < 2)) {
              localStorage.removeItem(`youtube-progress:${videoId}`);
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, videoId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

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

      <div className="youtube-embed-wrap" key={videoId}>
        <div id={`youtube-player-${videoId}`} className="youtube-iframe" />
      </div>

      {/* Resume Dialog Overlay */}
      {showResumeDialog && (
        <div className="resume-dialog-overlay animate-fade-in">
          <div className="resume-dialog-modal glassmorphism">
            <div className="resume-dialog-header">
              <h3>Tiếp tục xem?</h3>
              <button
                className="btn-close"
                onClick={() => setShowResumeDialog(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="resume-dialog-body">
              <p>
                Bạn đã xem đến <strong>{formatTime(savedTime)}</strong>. Bạn có muốn xem tiếp từ vị trí này?
              </p>
            </div>
            <div className="resume-dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowResumeDialog(false);
                  if (playerRef.current) {
                    playerRef.current.seekTo(0, true);
                    localStorage.removeItem(`youtube-progress:${videoId}`);
                    playerRef.current.playVideo();
                  }
                }}
              >
                Xem lại từ đầu
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowResumeDialog(false);
                  if (playerRef.current) {
                    playerRef.current.seekTo(savedTime, true);
                    playerRef.current.playVideo();
                  }
                }}
              >
                Xem tiếp
              </button>
            </div>
          </div>
        </div>
      )}

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
