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
  const [activeHandle, setActiveHandle] = useState("start");

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

    // Cleanup export resources on source change
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
      exportIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.removeEventListener("seeked", video._exportSeekHandler);
    }
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

    // Re-entry guard
    if (isExporting) return;

    const streamFn = video.captureStream || video.mozCaptureStream;
    if (!streamFn) {
      alert("Your browser does not support client-side video exporting. Please try Chrome, Firefox, or Edge.");
      return;
    }

    // Set export state before any async operations
    setIsExporting(true);
    setIsPlaying(false);
    video.pause();
    video.currentTime = startTime;

    const originalMuted = video.muted;
    const originalVolume = video.volume;
    const originalPlaybackRate = video.playbackRate;
    let exportCancelled = false;
    let objectUrl = null;

    // Centralized cleanup finalizer (idempotent)
    const cleanupExport = (restoreSettings = true) => {
      // Clear interval
      if (exportIntervalRef.current) {
        clearInterval(exportIntervalRef.current);
        exportIntervalRef.current = null;
      }

      // Stop and release recorder
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;

      // Revoke object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }

      // Restore video settings
      if (restoreSettings && video) {
        video.playbackRate = originalPlaybackRate;
        video.muted = originalMuted;
        video.volume = originalVolume;
        video.pause();
        setIsPlaying(false);
      }

      setIsExporting(false);
      setExportProgress(0);
    };

    const onSeeked = () => {
      try {
        const stream = streamFn.call(video);
<<<<<<< HEAD

        let options = { mimeType: "video/webm;codecs=vp9,opus" };
=======
        
        // Use high quality settings for better output - always try MP4 first
        let options = { mimeType: "video/mp4", videoBitsPerSecond: 8000000 };
>>>>>>> 152bded (move all style file to app.css)
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm;codecs=vp9,opus", videoBitsPerSecond: 8000000 };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm;codecs=vp8,opus", videoBitsPerSecond: 8000000 };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm", videoBitsPerSecond: 8000000 };
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
          cleanupExport();

          // Only download if not cancelled
          if (!exportCancelled && chunks.length > 0) {
            const mimeStr = options.mimeType || "video/webm";
            // Always save as .mp4 extension for consistency
            const blob = new Blob(chunks, { type: mimeStr });
            objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const dotIndex = name.lastIndexOf(".");
            const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
<<<<<<< HEAD
            const extension = mimeStr.includes("mp4") ? ".mp4" : ".webm";
            link.download = `${baseName}-trimmed${extension}`;
            link.href = objectUrl;
=======
            link.download = `${baseName}-trimmed.mp4`;
            link.href = url;
>>>>>>> 152bded (move all style file to app.css)
            link.click();
            setIsEditing(false);
          }
        };

        setExportProgress(0);

        video.muted = true;
<<<<<<< HEAD
        video.playbackRate = 1;
=======
        video.playbackRate = 1.0; // Normal speed for better quality
>>>>>>> 152bded (move all style file to app.css)

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
        cleanupExport();
      }
    };

    // Store handler reference for cleanup and use once option
    video._exportSeekHandler = onSeeked;
    video.addEventListener("seeked", onSeeked, { once: true });

    // Store cancellation flag setter for handleCancelExport
    video._setExportCancelled = () => { exportCancelled = true; };
  };

  const handleCancelExport = () => {
    const video = videoRef.current;
    if (!video) return;

    // Set cancellation flag to prevent download in onstop
    if (video._setExportCancelled) {
      video._setExportCancelled();
    }

    // Clear interval
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
      exportIntervalRef.current = null;
    }

    // Stop recorder
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    mediaRecorderRef.current = null;

    // Remove seeked listener
    if (video._exportSeekHandler) {
      video.removeEventListener("seeked", video._exportSeekHandler);
      video._exportSeekHandler = null;
    }

    // Restore video state
    video.pause();
    setIsPlaying(false);
    video.playbackRate = 1;
    video.muted = false;

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
            <div className="trim-double-slider-wrapper">
              <div className="trim-double-slider-labels">
                <span className="trim-time-badge">Start Time: {formatTime(startTime)}</span>
                <span className="trim-time-badge font-accent">End Time: {formatTime(endTime)}</span>
              </div>
              <div className="double-slider-container">
                <div className="double-slider-track"></div>
                <div 
                  className="double-slider-range"
                  style={{
                    left: `${(startTime / (duration || 1)) * 100}%`,
                    width: `${((endTime - startTime) / (duration || 1)) * 100}%`
                  }}
                ></div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={startTime}
                  onMouseDown={() => setActiveHandle("start")}
                  onTouchStart={() => setActiveHandle("start")}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStartTime(Math.min(val, endTime - 0.5));
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="double-slider-input"
                  style={{ zIndex: activeHandle === "start" ? 5 : 3 }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={endTime}
                  onMouseDown={() => setActiveHandle("end")}
                  onTouchStart={() => setActiveHandle("end")}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEndTime(Math.max(val, startTime + 0.5));
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="double-slider-input"
                  style={{ zIndex: activeHandle === "end" ? 5 : 3 }}
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
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleExportVideo}
              >
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

    </div>
  );
}
