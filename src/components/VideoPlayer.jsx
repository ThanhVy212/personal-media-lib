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
  Scissors,
  Download,
  X,
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

  // Trimming states
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const exportIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Auto-hide controls handler
  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Only auto-hide if playing and not editing/exporting
    if (isPlaying && !isEditing && !isExporting) {
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
  }, [isPlaying, isEditing, isExporting]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isEditing && !isExporting) {
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
    setIsEditing(false);
    setStartTime(0);
    setEndTime(0);
    setIsExporting(false);
    setExportProgress(0);
    if (exportIntervalRef.current) clearInterval(exportIntervalRef.current);
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
    if (isExporting) return;
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
  }, [isPlaying, isMuted, volume, isExporting]);

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
    if (!videoRef.current || isExporting) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (isExporting) return;
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
    if (!videoRef.current || isExporting) return;
    let newTime = videoRef.current.currentTime + seconds;
    if (isEditing) {
      newTime = Math.max(startTime, Math.min(newTime, endTime));
    } else {
      newTime = Math.max(0, Math.min(newTime, duration));
    }
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isExporting) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (isEditing) {
        if (curr >= endTime) {
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
        } else if (curr < startTime) {
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleScrubChange = (e) => {
    if (isExporting) return;
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
    if (!videoRef.current || isExporting) return;
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

  const handleExportVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const streamFn = video.captureStream || video.mozCaptureStream;
    if (!streamFn) {
      alert("Your browser does not support client-side video exporting. Please try Chrome, Firefox, or Edge.");
      return;
    }

    setIsPlaying(false);
    video.pause();
    video.currentTime = startTime;

    const originalMuted = video.muted;
    const originalVolume = video.volume;
    const originalPlaybackRate = video.playbackRate;

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);

      try {
        const stream = streamFn.call(video);
        
        let options = { mimeType: "video/webm;codecs=vp9,opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm;codecs=vp8,opus" };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/mp4" };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = {};
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (exportIntervalRef.current) clearInterval(exportIntervalRef.current);

          video.playbackRate = originalPlaybackRate;
          video.muted = originalMuted;
          video.volume = originalVolume;
          video.pause();
          setIsPlaying(false);

          if (chunks.length > 0) {
            const mimeStr = options.mimeType || "video/webm";
            const blob = new Blob(chunks, { type: mimeStr });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const dotIndex = name.lastIndexOf(".");
            const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
            const extension = mimeStr.includes("mp4") ? ".mp4" : ".webm";
            link.download = `${baseName}-trimmed${extension}`;
            link.href = url;
            link.click();
          }

          setIsExporting(false);
          setExportProgress(0);
          setIsEditing(false);
        };

        setIsExporting(true);
        setExportProgress(0);

        video.muted = true;
        video.playbackRate = 1.5; 

        mediaRecorder.start();
        video.play();
        setIsPlaying(true);

        const interval = setInterval(() => {
          const curr = video.currentTime;
          if (video.ended || curr >= endTime) {
            clearInterval(interval);
            mediaRecorder.stop();
          } else {
            const progress = ((curr - startTime) / (endTime - startTime)) * 100;
            setExportProgress(Math.min(99, Math.round(progress)));
          }
        }, 100);
        exportIntervalRef.current = interval;

      } catch (err) {
        console.error("Failed to export video:", err);
        alert("Failed to export video. Please try again.");
        video.playbackRate = originalPlaybackRate;
        video.muted = originalMuted;
        video.volume = originalVolume;
        setIsExporting(false);
        setExportProgress(0);
      }
    };

    video.addEventListener("seeked", onSeeked);
  };

  const handleCancelExport = () => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
    }
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.stop();
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      setIsPlaying(false);
      video.playbackRate = 1;
      video.muted = false;
    }
    setIsExporting(false);
    setExportProgress(0);
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
      className={`video-player-container no-select ${
        controlsVisible || isEditing ? "show-controls" : "hide-controls"
      }`}
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
      {!isEditing && !isExporting && (
        <div className="play-state-flash" onClick={togglePlay}>
          {isPlaying ? <Pause size={48} /> : <Play size={48} />}
        </div>
      )}

      {/* Exporting Overlay */}
      {isExporting && (
        <div className="export-overlay">
          <div className="export-modal glassmorphism animate-fade-in">
            <div className="viewport-spinner-container">
              <svg className="viewport-spinner" viewBox="0 0 50 50">
                <circle className="path-bg" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
                <circle 
                  className="path-fg" 
                  cx="25" 
                  cy="25" 
                  r="20" 
                  fill="none" 
                  strokeWidth="4"
                  strokeDasharray="125"
                  strokeDashoffset={125 - (125 * exportProgress) / 100}
                ></circle>
              </svg>
              <span className="viewport-progress-percentage">{exportProgress}%</span>
            </div>
            <h3 className="export-title">Exporting Video Clip...</h3>
            <p className="export-desc">Encoding trimmed segment. Please keep this tab active.</p>
            <button className="btn btn-danger" onClick={handleCancelExport}>
              <X size={16} />
              <span>Cancel Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom YouTube-style Control Bar Panel */}
      <div className="player-controls-card glassmorphism">
        
        {/* Trim controls panel */}
        {isEditing && (
          <div className="trim-panel animate-fade-in">
            <div className="trim-header-row">
              <span className="trim-title-badge">Trim Settings</span>
              <span className="trim-duration-badge">Clip Duration: {formatTime(endTime - startTime)}</span>
            </div>
            <div className="trim-sliders-container">
              <div className="trim-slider-item">
                <span className="trim-slider-label">Start Time: {formatTime(startTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStartTime(Math.min(val, endTime - 0.5));
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="custom-slider"
                />
              </div>
              <div className="trim-slider-item">
                <span className="trim-slider-label">End Time: {formatTime(endTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEndTime(Math.max(val, startTime + 0.5));
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="custom-slider"
                />
              </div>
            </div>
            <div className="trim-actions-row">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  videoRef.current.currentTime = startTime;
                  videoRef.current.play();
                  setIsPlaying(true);
                }}
              >
                Preview Trim
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExportVideo}>
                <Download size={14} />
                <span>Export & Download</span>
              </button>
            </div>
          </div>
        )}

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
            {isEditing && (
              <div
                className="trim-highlight-bar"
                style={{
                  left: `${(startTime / (duration || 1)) * 100}%`,
                  width: `${((endTime - startTime) / (duration || 1)) * 100}%`
                }}
              />
            )}
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

            {/* Scissors trim button */}
            <button
              className={`ctrl-btn ${isEditing ? "active-speed" : ""}`}
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                  setStartTime(0);
                  setEndTime(duration || 10);
                }
              }}
              title="Edit / Trim Video"
            >
              <Scissors size={20} />
            </button>

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

        /* Trimming panel styles */
        .trim-panel {
          background: rgba(8, 9, 12, 0.6);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .trim-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .trim-title-badge {
          font-weight: 700;
          color: var(--primary-hover);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .trim-duration-badge {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .trim-sliders-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .trim-slider-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .trim-slider-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          min-width: 100px;
        }

        .trim-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 8px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.8rem;
          border-radius: 6px;
        }

        .trim-highlight-bar {
          position: absolute;
          top: 0;
          bottom: 0;
          background: rgba(124, 58, 237, 0.4);
          border-left: 2px solid var(--primary);
          border-right: 2px solid var(--primary);
          pointer-events: none;
          z-index: 2;
        }

        /* Export Overlay styles */
        .export-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(5, 6, 8, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .export-modal {
          width: 90%;
          max-width: 380px;
          padding: 32px 24px;
          border-radius: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          background: rgba(24, 27, 40, 0.95);
        }

        .export-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .export-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .viewport-spinner-container {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .viewport-spinner {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .viewport-spinner .path-bg {
          stroke: rgba(255, 255, 255, 0.05);
        }

        .viewport-spinner .path-fg {
          stroke: var(--primary);
          stroke-linecap: round;
          transition: stroke-dashoffset 0.15s ease;
        }

        .viewport-progress-percentage {
          position: absolute;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
