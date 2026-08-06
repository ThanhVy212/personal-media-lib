import React, { useState, useEffect, useRef } from "react";
import UploadZone from "./components/UploadZone";
import Sidebar from "./components/Sidebar";
import ImageViewer from "./components/ImageViewer";
import VideoPlayer from "./components/VideoPlayer";
import YouTubePlayer from "./components/YouTubePlayer";
import ImageComparer from "./components/ImageComparer";
import AudioPlayer from "./components/AudioPlayer";
import {
  Menu,
  FolderOpen,
  AlertCircle,
  FilePlus,
  Sparkles,
  Download,
  Sliders,
} from "lucide-react";
import "./App.css";
import { parseMediaLink, isBlobMediaUrl, generateVideoThumbnail } from "./utils/mediaUrl.js";

const GITHUB_REPO_URL = "https://github.com/ThanhVy212/personal-media-lib";

function revokeMediaUrl(item) {
  if (item?.url && isBlobMediaUrl(item.url)) {
    URL.revokeObjectURL(item.url);
  }
}

export default function App() {
  const [mediaList, setMediaList] = useState([]);
  const [activeIndex, setActiveIndex] = useState("upload");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth > 768,
  );
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const mediaListRef = useRef(mediaList);
  useEffect(() => {
    mediaListRef.current = mediaList;
  }, [mediaList]);

  // Clean up object URLs on unmount to avoid browser memory leaks
  useEffect(() => {
    return () => {
      mediaListRef.current.forEach((item) => {
        revokeMediaUrl(item);
      });
    };
  }, []);

  // Sync sidebar open state when crossing mobile/desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleBreakpointChange = (e) => {
      setIsSidebarOpen(!e.matches);
    };
    mq.addEventListener("change", handleBreakpointChange);
    return () => mq.removeEventListener("change", handleBreakpointChange);
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

  // Natural sort function for alphanumeric sorting
  const naturalSort = (a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    
    // Split into parts: numbers and non-numbers
    const splitA = nameA.split(/(\d+)/g);
    const splitB = nameB.split(/(\d+)/g);
    
    for (let i = 0; i < Math.min(splitA.length, splitB.length); i++) {
      const partA = splitA[i];
      const partB = splitB[i];
      
      // If both parts are numbers, compare numerically
      if (!isNaN(partA) && !isNaN(partB) && partA !== '' && partB !== '') {
        const numA = parseInt(partA, 10);
        const numB = parseInt(partB, 10);
        if (numA !== numB) {
          return numA - numB;
        }
      } else {
        // Compare alphabetically
        if (partA < partB) return -1;
        if (partA > partB) return 1;
      }
    }
    
    // If all parts are equal, shorter string comes first
    return splitA.length - splitB.length;
  };

  const handleFilesSelected = (newFiles) => {
    const items = newFiles.map((file) => {
      const speed = parseFloat((Math.random() * 6 + 2).toFixed(1)); // MB/s (2 to 8)
      return {
        id: Math.random().toString(36).substring(2, 9) + Date.now(),
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "image",
        size: file.size,
        status: "uploading",
        progress: 0,
        speed,
      };
    });

    setMediaList((prevList) => {
      const updated = [...prevList, ...items];
      // Sort the list using natural sort
      updated.sort(naturalSort);
      
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

          // Extract thumbnail frame for local videos once upload completes
          if (item.type === "video") {
            generateVideoThumbnail(item.url)
              .then((thumbUrl) => {
                setMediaList((prevList) =>
                  prevList.map((m) =>
                    m.id === item.id ? { ...m, thumbnailUrl: thumbUrl } : m
                  )
                );
              })
              .catch((err) => {
                console.error("Error generating thumbnail for", item.name, err);
              });
          }
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

  const handleAddMediaLink = (rawUrl) => {
    const parsed = parseMediaLink(rawUrl);
    if (!parsed) {
      showToast(
        "Link không hợp lệ. Hỗ trợ YouTube hoặc video trực tiếp (.mp4, .webm, …).",
        "info",
      );
      return;
    }

    const item = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      file: null,
      name: parsed.name,
      url: parsed.type === "youtube" ? parsed.url : parsed.url,
      type: parsed.type,
      videoId: parsed.videoId,
      size: 0,
      status: "completed",
      progress: 100,
      isRemote: true,
    };

    setMediaList((prev) => {
      const updated = [...prev, item];
      // Sort the list using natural sort
      updated.sort(naturalSort);
      // Find the new index of the added item
      const newIndex = updated.findIndex((m) => m.id === item.id);
      setActiveIndex(newIndex);
      return updated;
    });

    showToast(
      parsed.type === "youtube" ? "Đã thêm video YouTube" : "Đã thêm link video",
      "success",
    );

    // Extract thumbnail frame for direct link videos in the background
    if (parsed.type === "video") {
      generateVideoThumbnail(parsed.url)
        .then((thumbUrl) => {
          setMediaList((prevList) =>
            prevList.map((m) =>
              m.id === item.id ? { ...m, thumbnailUrl: thumbUrl } : m
            )
          );
        })
        .catch((e) => console.warn("Failed link thumbnail extraction:", e));
    }
  };

  const handleDelete = (indexToDelete) => {
    const item = mediaList[indexToDelete];
    if (item) {
      revokeMediaUrl(item);
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
        revokeMediaUrl(item);
      });
      setMediaList([]);
      setActiveIndex("upload");
      showToast("Library cleared", "info");
    }
  };

  const handleDownloadAll = async () => {
    const downloadableFiles = mediaList.filter(
      (item) => item.file && item.status === "completed"
    );

    if (downloadableFiles.length === 0) {
      showToast("No files available to download", "info");
      return;
    }

    // Check if File System Access API is supported
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        showToast(
          `Saving ${downloadableFiles.length} file${downloadableFiles.length > 1 ? "s" : ""} to selected folder...`,
          "info",
        );

        for (let i = 0; i < downloadableFiles.length; i++) {
          const item = downloadableFiles[i];
          // Get file extension from original name
          const ext = item.name.includes('.') 
            ? item.name.substring(item.name.lastIndexOf('.')) 
            : '';
          // Create sequential filename
          const newName = `${i + 1}${ext}`;
          
          const fileHandle = await dirHandle.getFileHandle(newName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(item.file);
          await writable.close();
          
          // Add delay between downloads to ensure sequential completion
          if (i < downloadableFiles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        showToast(
          `Saved ${downloadableFiles.length} file${downloadableFiles.length > 1 ? "s" : ""} to folder`,
          "success",
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          showToast("Error saving files: " + err.message, "info");
        }
      }
    } else {
      // Fallback to regular download for browsers without File System Access API
      showToast(
        `Downloading ${downloadableFiles.length} file${downloadableFiles.length > 1 ? "s" : ""}...`,
        "info",
      );

      for (let i = 0; i < downloadableFiles.length; i++) {
        const item = downloadableFiles[i];
        // Get file extension from original name
        const ext = item.name.includes('.') 
          ? item.name.substring(item.name.lastIndexOf('.')) 
          : '';
        // Create sequential filename
        const newName = `${i + 1}${ext}`;
        
        const link = document.createElement("a");
        link.href = item.url;
        link.download = newName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Add small delay between downloads to avoid browser blocking
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      showToast(
        `Downloaded ${downloadableFiles.length} file${downloadableFiles.length > 1 ? "s" : ""}`,
        "success",
      );
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

  const handleSelect = (index) => {
    setActiveIndex(index);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    setMediaList((prevList) => {
      const newList = [...prevList];
      const [movedItem] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, movedItem);
      
      // Update activeIndex if needed
      if (activeIndex === fromIndex) {
        setActiveIndex(toIndex);
      } else if (fromIndex < activeIndex && toIndex >= activeIndex) {
        setActiveIndex(activeIndex - 1);
      } else if (fromIndex > activeIndex && toIndex <= activeIndex) {
        setActiveIndex(activeIndex + 1);
      }
      
      return newList;
    });
  };

  const activeMedia =
    activeIndex !== null && activeIndex !== "upload" && activeIndex !== "compare"
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
            className={`btn btn-secondary ${activeIndex === "compare" ? "btn-active-tab" : ""}`}
            onClick={() => setActiveIndex(activeIndex === "compare" ? "upload" : "compare")}
            disabled={mediaList.filter(m => m.type === "image" && m.status === "completed").length < 2}
            title="So sánh 2 ảnh"
          >
            <Sliders size={16} />
            <span className="btn-label">So sánh</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadAll}
            disabled={mediaList.length === 0}
            title="Download all files"
          >
            <Download size={16} />
            <span className="btn-label">Download All</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              // Trigger upload trigger via Sidebar file element
              const addBtn = document.querySelector(".add-btn");
              if (addBtn) addBtn.click();
            }}
          >
            <FilePlus size={16} />
            <span className="btn-label">Import</span>
          </button>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-icon btn-secondary github-link"
            title="View on GitHub"
            aria-label="View source on GitHub"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="app-workspace">
        {isSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar
          mediaList={mediaList}
          activeIndex={activeIndex}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onAddFiles={handleFilesSelected}
          onClearAll={handleClearAll}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          onReorder={handleReorder}
        />

        <main className="app-viewport">
          {activeIndex === "compare" ? (
            <ImageComparer
              mediaList={mediaList}
              onClose={() => setActiveIndex("upload")}
            />
          ) : activeIndex === "upload" ? (
            <UploadZone
              onFilesSelected={handleFilesSelected}
              onAddMediaLink={handleAddMediaLink}
              mediaList={mediaList}
            />
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
                onToast={showToast}
              />
            ) : activeMedia.type === "youtube" ? (
              <YouTubePlayer
                videoId={activeMedia.videoId}
                name={activeMedia.name}
                watchUrl={activeMedia.url}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex !== "upload" && activeIndex > 0}
                hasNext={
                  activeIndex !== "upload" && activeIndex < mediaList.length - 1
                }
              />
            ) : activeMedia.type === "audio" ? (
              <AudioPlayer
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
                allowTrim={!activeMedia.isRemote}
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
    </div>
  );
}
