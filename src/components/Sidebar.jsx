import React, { useState, useRef } from "react";
import {
  Trash2,
  Film,
  Plus,
  X,
  Search,
  FolderOpen,
  Upload,
} from "lucide-react";

export default function Sidebar({
  mediaList,
  activeIndex,
  onSelect,
  onDelete,
  onAddFiles,
  onClearAll,
  isOpen,
  onToggle,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleAddClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const mediaFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      );
      if (mediaFiles.length > 0) {
        onAddFiles(mediaFiles);
      }
    }
    e.target.value = ""; // Reset
  };

  const filteredMedia = mediaList.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <aside className={`sidebar glassmorphism ${isOpen ? "open" : "closed"}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*"
        className="hidden-input"
      />

      <div className="sidebar-header">
        <div className="sidebar-title-section">
          <FolderOpen className="sidebar-header-icon" size={18} />
          <h3>Media Library ({mediaList.length})</h3>
        </div>
        <button
          className="btn btn-icon btn-secondary close-sidebar-btn"
          onClick={onToggle}
          data-tooltip="Close Sidebar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="btn btn-primary add-btn" onClick={handleAddClick}>
          <Plus size={16} />
          <span>Add Files</span>
        </button>
        <button className="btn btn-danger clear-btn" onClick={onClearAll}>
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>

      <div
        className={`upload-zone-link ${activeIndex === "upload" ? "active" : ""}`}
        onClick={() => onSelect("upload")}
      >
        <div className="upload-link-icon-container">
          <Upload size={18} />
        </div>
        <div className="upload-link-text">
          <span className="title">Upload Zone</span>
          <span className="desc">Drag & drop or browse</span>
        </div>
      </div>

      <div className="search-box-container">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="media-list-container">
        {filteredMedia.length === 0 ? (
          <div className="empty-search">
            {searchQuery ? "No files match search" : "No files uploaded"}
          </div>
        ) : (
          filteredMedia.map((item) => {
            const listIndex = mediaList.findIndex((m) => m.id === item.id);
            const isActive = listIndex === activeIndex;
            const isUploading = item.status === "uploading";

            return (
              <div
                key={item.id}
                className={`media-item ${isActive ? "active" : ""} ${isUploading ? "uploading animate-pulse-border" : ""}`}
                onClick={() => onSelect(listIndex)}
              >
                <div className="thumbnail-wrapper">
                  {isUploading ? (
                    <div className="sidebar-uploading-spinner-container">
                      <svg
                        className="sidebar-uploading-spinner"
                        viewBox="0 0 36 36"
                      >
                        <circle
                          className="path-bg"
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          strokeWidth="3"
                        ></circle>
                        <circle
                          className="path-fg"
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          strokeWidth="3"
                          strokeDasharray="88"
                          strokeDashoffset={88 - (88 * item.progress) / 100}
                        ></circle>
                      </svg>
                    </div>
                  ) : item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="sidebar-thumbnail"
                      loading="lazy"
                    />
                  ) : (
                    <div className="video-thumbnail-container">
                      <video
                        src={item.url}
                        className="sidebar-thumbnail"
                        preload="metadata"
                        muted
                      />
                      <Film className="video-overlay-icon" size={16} />
                    </div>
                  )}
                </div>

                <div className="media-details">
                  <span className="media-name" title={item.name}>
                    {item.name}
                  </span>
                  {isUploading ? (
                    <span className="media-meta upload-progress-text">
                      Uploading ({Math.round(item.progress)}%)
                    </span>
                  ) : (
                    <span className="media-meta">
                      {item.type === "image" ? "Image" : "Video"} •{" "}
                      {formatSize(item.size)}
                    </span>
                  )}
                </div>

                {!isUploading && (
                  <button
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(listIndex);
                    }}
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .sidebar {
          width: 320px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
          overflow: hidden;
        }

        .sidebar.closed {
          width: 0;
          border-right: none;
          transform: translateX(-100%);
        }

        .sidebar-header {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-title-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-header-icon {
          color: var(--primary);
        }

        .sidebar-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sidebar-actions {
          padding: 16px 20px;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid var(--border);
        }

        .add-btn {
          flex: 1;
        }

        .clear-btn {
          padding: 8px 12px;
        }

        .search-box-container {
          padding: 12px 20px;
          position: relative;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 32px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background: var(--bg-darker);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 8px 12px 8px 36px;
          border-radius: 8px;
          font-size: 0.85rem;
          outline: none;
          transition: var(--transition-smooth);
        }

        .search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .search-clear {
          position: absolute;
          right: 32px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .search-clear:hover {
          color: var(--text-primary);
        }

        .media-list-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-search {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.875rem;
          padding: 40px 20px;
        }

        .media-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
          border: 1px solid transparent;
          position: relative;
          background: rgba(255, 255, 255, 0.01);
          overflow: hidden;

          flex-shrink: 0;
          min-height: 72px;
        }

        .media-item:hover {
          background: var(--bg-hover);
          transform: translateX(2px);
        }

        .media-item.active {
          background: var(--primary-light);
          border-color: rgba(124, 58, 237, 0.3);
        }

        .thumbnail-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 6px;
          overflow: hidden;
          background: var(--bg-darker);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          border: 1px solid var(--border);
        }

        .sidebar-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-thumbnail-container {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-overlay-icon {
          position: absolute;
          color: var(--text-primary);
          background: rgba(0, 0, 0, 0.6);
          padding: 4px;
          border-radius: 50%;
          box-sizing: content-box;
        }

        .media-details {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Important for ellipsis truncation */
        }

        .media-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .media-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .upload-progress-text {
          color: var(--accent) !important;
          font-weight: 600;
        }

        .media-item.uploading {
          background: rgba(6, 182, 212, 0.02);
          border-color: rgba(6, 182, 212, 0.1);
        }

        .sidebar-uploading-spinner-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
        }

        .sidebar-uploading-spinner {
          width: 28px;
          height: 28px;
          transform: rotate(-90deg);
        }

        .sidebar-uploading-spinner .path-bg {
          stroke: rgba(255, 255, 255, 0.05);
        }

        .sidebar-uploading-spinner .path-fg {
          stroke: var(--accent);
          stroke-linecap: round;
          transition: stroke-dashoffset 0.15s ease;
        }

        .btn-delete {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          opacity: 0;
          transition: var(--transition-smooth);
          padding: 6px;
          border-radius: 6px;
        }

        .media-item:hover .btn-delete {
          opacity: 1;
        }

        .btn-delete:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .hidden-input {
          display: none;
        }

        .upload-zone-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
          border: 1px solid transparent;
          background: rgba(124, 58, 237, 0.04);
          margin-bottom: 4px;
          flex-shrink: 0;
        }

        .upload-zone-link:hover {
          background: rgba(124, 58, 237, 0.1);
          transform: translateX(2px);
        }

        .upload-zone-link.active {
          background: var(--primary-light);
          border-color: rgba(124, 58, 237, 0.3);
        }

        .upload-zone-link.active .upload-link-icon-container {
          background: var(--primary);
          color: var(--text-primary);
        }

        .upload-link-icon-container {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(124, 58, 237, 0.15);
          color: var(--primary);
          flex-shrink: 0;
          transition: var(--transition-smooth);
        }

        .upload-link-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .upload-link-text .title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .upload-link-text .desc {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 4px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            height: 100%;
          }
          .sidebar.open {
            width: 280px;
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
          }
        }
      `}</style>
    </aside>
  );
}
