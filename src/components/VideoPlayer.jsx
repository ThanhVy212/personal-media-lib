import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Monitor,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

export default function VideoPlayer({
  src,
  name,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Auto-hide controls handler
  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Only auto-hide if playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSpeedMenu(false);
      }, 2500);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setControlsVisible(false);
      setShowSpeedMenu(false);
    }
  };

  // Sync state when video source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackRate(1);
    setShowSpeedMenu(false);
    setControlsVisible(true);
  }, [src]);

  // Sync volume with browser audio level
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events if focused on input elements (e.g., search box)
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "arrowright":
          seek(5);
          break;
        case "arrowleft":
          seek(-5);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((prev) => Math.min(prev + 0.1, 1));
          setIsMuted(false);
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((prev) => Math.max(prev - 0.1, 0));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  // Listen to native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const seek = (seconds) => {
    if (!videoRef.current) return;
    let newTime = videoRef.current.currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, duration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrubChange = (e) => {
    const val = parseFloat(e.target.value);
    videoRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
    }
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

  const handlePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Picture-in-Picture failed", error);
    }
  };

  // Timeline Mouse Hover for preview time tooltips
  const handleTimelineMouseMove = (e) => {
    if (!timelineRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(pos, 1));
    setHoverTime(clampedPos * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Select suitable volume icon
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  // Progress Bar styling helper (fills track dynamically)
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-player-container no-select ${controlsVisible ? "show-controls" : "hide-controls"}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Banner overlay */}
      <div className="video-title-overlay">
        <span>{name}</span>
      </div>

      {/* Video Content */}
      <video
        ref={videoRef}
        src={src}
        className="main-video-element"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
      />

      {/* Big Playback Indicator overlay (Brief flash when playing/pausing) */}
      <div className="play-state-flash" onClick={togglePlay}>
        {isPlaying ? <Pause size={48} /> : <Play size={48} />}
      </div>

      {/* Custom YouTube-style Control Bar Panel */}
      <div className="player-controls-card glassmorphism">
        {/* Timeline Slider Track */}
        <div
          ref={timelineRef}
          className="timeline-slider-wrapper slider-container"
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="timeline-hover-tooltip"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Color Fill Track background */}
          <div className="timeline-visual-track">
            <div
              className="timeline-played-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleScrubChange}
            className="custom-slider timeline-input-range"
          />
        </div>

        {/* Action Controls Row */}
        <div className="controls-row">
          <div className="controls-left">
            <button
              className="ctrl-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>

            {hasPrev && (
              <button
                className="ctrl-btn secondary-ctrl"
                onClick={onPrev}
                title="Previous Media"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {hasNext && (
              <button
                className="ctrl-btn secondary-ctrl"
                onClick={onNext}
                title="Next Media"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Volume section */}
            <div className="volume-control-wrapper">
              <button
                className="ctrl-btn"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {renderVolumeIcon()}
              </button>
              <div className="volume-slider-container slider-container">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeSliderChange}
                  className="custom-slider volume-slider-input"
                />
              </div>
            </div>

            {/* Time Indicators */}
            <div className="time-display">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="time-divider">/</span>
              <span className="duration-time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="controls-right">
            {/* Picture in Picture */}
            {document.pictureInPictureEnabled && (
              <button
                className="ctrl-btn"
                onClick={handlePip}
                title="Picture-in-Picture"
              >
                <Monitor size={20} />
              </button>
            )}

            {/* Playback speed selector dropdown */}
            <div className="speed-control-wrapper">
              <button
                className={`ctrl-btn speed-toggle-btn ${playbackRate !== 1 ? "active-speed" : ""}`}
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="Playback Speed"
              >
                <Settings
                  size={20}
                  className={showSpeedMenu ? "rotate-icon" : ""}
                />
                {playbackRate !== 1 && (
                  <span className="speed-badge">{playbackRate}x</span>
                )}
              </button>

              {showSpeedMenu && (
                <div className="speed-dropdown-menu glassmorphism">
                  <div className="menu-header">Playback Speed</div>
                  {speedOptions.map((option) => (
                    <button
                      key={option}
                      className={`speed-option-item ${playbackRate === option ? "selected" : ""}`}
                      onClick={() => handleSpeedChange(option)}
                    >
                      {option === 1 ? "Normal" : `${option}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen control */}
            <button
              className="ctrl-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .video-player-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #020203;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .main-video-element {
          width: 100%;
          height: 100%;
          max-height: 100%;
          object-fit: contain;
          cursor: pointer;
        }

        .video-title-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px 24px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 500;
          z-index: 10;
          transition: opacity 0.3s ease;
          pointer-events: none;
          text-align: center;
        }

        /* Full Control Bar Panel */
        .player-controls-card {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 24px;
          padding: 12px 18px 8px;
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Auto-hide states */
        .hide-controls {
          cursor: none;
        }
        .hide-controls .player-controls-card {
          opacity: 0;
          transform: translateY(12px);
          pointer-events: none;
        }
        .hide-controls .video-title-overlay {
          opacity: 0;
        }

        .show-controls .player-controls-card {
          opacity: 1;
          transform: translateY(0);
        }
        .show-controls .video-title-overlay {
          opacity: 1;
        }

        /* Big overlay flash states */
        .play-state-flash {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
        }

        .play-state-flash svg {
          background: rgba(0, 0, 0, 0.6);
          padding: 16px;
          border-radius: 50%;
          color: #fff;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .video-player-container:active .play-state-flash svg {
          opacity: 1;
          transform: scale(1.1);
        }

        /* Timeline and progress styling */
        .timeline-slider-wrapper {
          position: relative;
          width: 100%;
          height: 16px;
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .timeline-input-range {
          position: absolute;
          z-index: 5;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .timeline-visual-track {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .timeline-slider-wrapper:hover .timeline-visual-track {
          height: 6px;
        }

        .timeline-played-fill {
          height: 100%;
          background: var(--primary);
          width: 0%;
        }

        .timeline-hover-tooltip {
          position: absolute;
          bottom: 24px;
          transform: translateX(-50%);
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: var(--shadow-md);
          z-index: 15;
          animation: fadeIn 0.15s ease-out;
        }

        /* Controls row layout */
        .controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ctrl-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary-hover);
        }

        .secondary-ctrl {
          color: var(--text-secondary);
        }

        /* Volume controls slider overlay styling */
        .volume-control-wrapper {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .volume-slider-container {
          width: 0;
          overflow: hidden;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s;
          display: flex;
          align-items: center;
        }

        .volume-control-wrapper:hover .volume-slider-container {
          width: 80px;
          margin-left: 6px;
          margin-right: 6px;
        }

        .volume-slider-input {
          width: 80px;
        }

        /* Time displays */
        .time-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-left: 8px;
          font-weight: 500;
        }

        .time-divider {
          color: var(--text-muted);
        }

        .duration-time {
          color: var(--text-muted);
        }

        /* Speed controllers dropdown */
        .speed-control-wrapper {
          position: relative;
        }

        .speed-toggle-btn {
          position: relative;
        }

        .active-speed {
          color: var(--primary);
        }

        .speed-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--primary);
          color: var(--text-primary);
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 4px;
          border: 1px solid var(--bg-card);
        }

        .rotate-icon {
          transform: rotate(45deg);
        }

        .speed-dropdown-menu {
          position: absolute;
          bottom: 48px;
          right: 0;
          width: 140px;
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          z-index: 20;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .menu-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          padding: 6px 10px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .speed-option-item {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 10px;
          border-radius: 8px;
          text-align: left;
          font-size: 0.85rem;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .speed-option-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .speed-option-item.selected {
          background: var(--primary-light);
          color: var(--primary-hover);
          font-weight: 600;
        }

        /* Fullscreen modifications */
        .video-player-container:fullscreen {
          width: 100vw;
          height: 100vh;
        }

        .video-player-container:fullscreen .main-video-element {
          width: 100%;
          height: 100%;
        }

        .video-player-container:fullscreen .player-controls-card {
          bottom: 40px;
          left: 40px;
          right: 40px;
        }
      `}</style>
    </div>
  );
}
