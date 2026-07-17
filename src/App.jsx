import React, { useState, useEffect, useRef } from "react";
import UploadZone from "./components/UploadZone";
import Sidebar from "./components/Sidebar";
import ImageViewer from "./components/ImageViewer";
import VideoPlayer from "./components/VideoPlayer";
import {
  Menu,
  FolderOpen,
  AlertCircle,
  FilePlus,
  Sparkles,
} from "lucide-react";
import "./App.css";

export default function App() {
  const [mediaList, setMediaList] = useState([]);
  const [activeIndex, setActiveIndex] = useState("upload");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Clean up object URLs on unmount to avoid browser memory leaks
  useEffect(() => {
    return () => {
      mediaList.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const showToast = (message, type = "info") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFilesSelected = (newFiles) => {
    const items = newFiles.map((file) => {
      const speed = parseFloat((Math.random() * 6 + 2).toFixed(1)); // MB/s (2 to 8)
      return {
        id: Math.random().toString(36).substring(2, 9) + Date.now(),
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
        size: file.size,
        status: "uploading",
        progress: 0,
        speed,
      };
    });

    setMediaList((prevList) => {
      const updated = [...prevList, ...items];
      // If we don't have any active selection, or if we were on "upload" page and just started,
      // let's keep activeIndex as is, or select first uploading item if activeIndex is null.
      if (activeIndex === null && updated.length > 0) {
        return updated;
      }
      return updated;
    });

    showToast(
      `Uploading ${items.length} file${items.length > 1 ? "s" : ""}...`,
      "info",
    );

    // Simulate upload for each item
    items.forEach((item) => {
      const sizeInMB = item.size / (1024 * 1024);
      // Duration based on size and speed. Make it at least 1.5 seconds, max 6 seconds
      const durationMs = Math.max(1500, Math.min(6000, (sizeInMB / item.speed) * 1000));
      const intervalTime = 150;
      const totalSteps = durationMs / intervalTime;
      const baseStep = 100 / totalSteps;
      
      let currentProgress = 0;
      const interval = setInterval(() => {
        // Add random jitter to step sizes
        const jitter = Math.random() * 8 - 3; // skewed positive
        currentProgress = Math.min(100, currentProgress + baseStep + jitter);
        
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          
          setMediaList((prevList) =>
            prevList.map((m) =>
              m.id === item.id ? { ...m, progress: 100, status: "completed" } : m
            )
          );
          
          showToast(`Uploaded "${item.name}"`, "success");
        } else {
          setMediaList((prevList) =>
            prevList.map((m) =>
              m.id === item.id ? { ...m, progress: currentProgress } : m
            )
          );
        }
      }, intervalTime);
    });
  };

  const handleDelete = (indexToDelete) => {
    const item = mediaList[indexToDelete];
    if (item) {
      URL.revokeObjectURL(item.url);
    }

    const newList = mediaList.filter((_, i) => i !== indexToDelete);
    setMediaList(newList);

    if (newList.length === 0) {
      setActiveIndex("upload");
    } else if (indexToDelete === activeIndex) {
      // If we delete the active element, select the next available one
      setActiveIndex(Math.min(indexToDelete, newList.length - 1));
    } else if (indexToDelete < activeIndex) {
      // If we delete an element before the active index, shift index down
      setActiveIndex(activeIndex - 1);
    }

    showToast(`Removed "${item?.name || "file"}"`, "info");
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire library? All files will be released from browser memory.",
      )
    ) {
      mediaList.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
      setMediaList([]);
      setActiveIndex("upload");
      showToast("Library cleared", "info");
    }
  };

  const handlePrev = () => {
    if (activeIndex !== "upload" && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex !== "upload" && activeIndex < mediaList.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const activeMedia =
    activeIndex !== null && activeIndex !== "upload"
      ? mediaList[activeIndex]
      : null;

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="app-header glassmorphism">
        <div className="logo-section">
          <button
            className="btn btn-icon btn-secondary"
            onClick={toggleSidebar}
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            <Menu size={20} />
          </button>
          <div className="logo-section">
            <FolderOpen className="logo-icon" size={22} />
            <h1 className="logo-text">Media Library</h1>
          </div>
        </div>

        <div className="header-actions">
          {activeMedia && (
            <span className="active-media-name-badge">
              Viewing: {activeMedia.name}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              // Trigger upload trigger via Sidebar file element
              const addBtn = document.querySelector(".add-btn");
              if (addBtn) addBtn.click();
            }}
          >
            <FilePlus size={16} />
            <span>Import</span>
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="app-workspace">
        <Sidebar
          mediaList={mediaList}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onDelete={handleDelete}
          onAddFiles={handleFilesSelected}
          onClearAll={handleClearAll}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        <main className="app-viewport">
          {activeIndex === "upload" ? (
            <UploadZone onFilesSelected={handleFilesSelected} mediaList={mediaList} />
          ) : activeMedia ? (
            activeMedia.status === "uploading" ? (
              <div className="media-uploading-viewport animate-fade-in">
                <div className="uploading-viewport-card glassmorphism animate-pulse-border">
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
                        strokeDashoffset={125 - (125 * activeMedia.progress) / 100}
                      ></circle>
                    </svg>
                    <span className="viewport-progress-percentage">{Math.round(activeMedia.progress)}%</span>
                  </div>
                  <h3 className="uploading-title">Uploading "{activeMedia.name}"</h3>
                  <p className="uploading-desc">Processing and optimizing media in browser...</p>
                  <div className="viewport-upload-meta">
                    <span>Size: {formatSize(activeMedia.size)}</span>
                    <span>Speed: {activeMedia.speed} MB/s</span>
                  </div>
                </div>
              </div>
            ) : activeMedia.type === "image" ? (
              <ImageViewer
                src={activeMedia.url}
                name={activeMedia.name}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex !== "upload" && activeIndex > 0}
                hasNext={
                  activeIndex !== "upload" && activeIndex < mediaList.length - 1
                }
              />
            ) : (
              <VideoPlayer
                src={activeMedia.url}
                name={activeMedia.name}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex !== "upload" && activeIndex > 0}
                hasNext={
                  activeIndex !== "upload" && activeIndex < mediaList.length - 1
                }
              />
            )
          ) : (
            <div className="no-active-selection">
              <AlertCircle size={32} className="logo-icon" />
              <p>No media selected. Select an item from the sidebar to view.</p>
            </div>
          )}
        </main>
      </div>

      {/* Floating Status Toast */}
      {toast && (
        <div className="toast animate-fade-in">
          <Sparkles size={16} className="logo-icon" />
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        .active-media-name-badge {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: 6px;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
        }

        .no-active-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: var(--text-secondary);
          text-align: center;
          padding: 24px;
        }

        .media-uploading-viewport {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 24px;
        }

        .uploading-viewport-card {
          width: 100%;
          max-width: 400px;
          padding: 40px 32px;
          border-radius: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          background: rgba(24, 27, 40, 0.6);
        }

        .viewport-spinner-container {
          position: relative;
          width: 100px;
          height: 100px;
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
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .uploading-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          word-break: break-all;
        }

        .uploading-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }

        .viewport-upload-meta {
          display: flex;
          gap: 16px;
          font-size: 0.8rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          padding-top: 16px;
          width: 100%;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .active-media-name-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
