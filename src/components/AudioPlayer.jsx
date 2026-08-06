import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  ChevronLeft,
  ChevronRight,
  Music,
} from "lucide-react";

export default function AudioPlayer({
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
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const audioRef = useRef(null);
  const timelineRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Web Audio API refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Sync state on source change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackRate(1);
    setShowSpeedMenu(false);
    
    // Cleanup Web Audio nodes on source change if necessary
    // But we usually can reuse the same audio context / connection if source is loaded in the same audio tag
  }, [src]);

  // Sync volume with browser audio level
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isMuted, volume]);

  // Web Audio Visualizer Setup
  const setupVisualizer = () => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.warn("Failed to initialize Web Audio visualizer (CORS or browser policies):", err);
    }
  };

  // Draw loop for visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    // Resize canvas based on client rect
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        width = canvas.width;
        height = canvas.height;
      }
    });
    resizeObserver.observe(canvas);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, width, height);

      // Web Audio frequency data
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i];

          // Create a gradient for the visualizer
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, "rgba(124, 58, 237, 0.2)"); // Violet primary
          gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.8)"); // Cyan accent
          gradient.addColorStop(1, "rgba(124, 58, 237, 1)");

          ctx.fillStyle = gradient;
          
          // Draw rounded bar
          const h = (barHeight / 255) * height * 0.8;
          ctx.beginPath();
          ctx.roundRect(x, height - h, barWidth - 2, h, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Flat static/dummy line or wave when paused/unsupported
        ctx.strokeStyle = "rgba(124, 58, 237, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const sliceWidth = width / 100;
        let x = 0;

        for (let i = 0; i < 100; i++) {
          const time = Date.now() * 0.003;
          const y = isPlaying 
            ? (height / 2) + Math.sin(i * 0.15 + time) * 15 // CSS fake wave
            : height / 2; // Flat line

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [isPlaying]);

  // Cleanup audio nodes on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    setupVisualizer();

    // Resume AudioContext if suspended (browser security)
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.log("Play failed", e));
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
    if (!audioRef.current) return;
    let newTime = audioRef.current.currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, duration));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleScrubChange = (e) => {
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleSpeedChange = (speed) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
    }
  };

  // Timeline Mouse Hover
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

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player-container no-select show-controls">
      {/* Hidden Audio Tag */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Banner overlay */}
      <div className="video-title-overlay">
        <span>{name}</span>
      </div>

      {/* Main Music Visualizer view card */}
      <div className="audio-visualizer-view">
        <div className="vinyl-record-container">
          <div className={`vinyl-record-glass ${isPlaying ? "vinyl-playing" : "vinyl-paused"}`}>
            <div className="vinyl-grooves">
              <div className="vinyl-center-sticker">
                <Music size={32} className="text-violet-400" />
              </div>
            </div>
          </div>
          <div className="audio-track-details">
            <h3 className="audio-track-title">{name}</h3>
            <span className="audio-track-artist">Audio File</span>
          </div>
        </div>

        {/* Waves Canvas */}
        <canvas ref={canvasRef} className="visualizer-canvas" />
      </div>

      {/* Control panel */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
