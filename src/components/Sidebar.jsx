import React, { useState, useRef } from "react";
import {
  Trash2,
  Film,
  Plus,
  X,
  Search,
  FolderOpen,
  Upload,
  Video,
  Music,
  FileText,
  File,
  ArrowUpDown,
} from "lucide-react";
import { youtubeThumbnailUrl } from "../utils/mediaUrl.js";

export default function Sidebar({
  mediaList,
  activeIndex,
  onSelect,
  onDelete,
  onAddFiles,
  onClearAll,
  isOpen,
  onToggle,
  onReorder,
  onSortAZ,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    onReorder(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const mediaFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          file.type.startsWith("audio/") ||
          file.type === "application/pdf" ||
          file.type === "text/plain" ||
          file.type === "application/msword" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.toLowerCase().endsWith(".doc") ||
          file.name.toLowerCase().endsWith(".docx") ||
          file.name.toLowerCase().endsWith(".txt") ||
          file.name.toLowerCase().endsWith(".pdf"),
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
        accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
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

      <div className="search-sort-row">
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
        <button
          className="btn btn-secondary sort-az-btn"
          onClick={onSortAZ}
          title="Sắp xếp danh sách theo tên từ A->Z"
          disabled={mediaList.length < 2}
        >
          <ArrowUpDown size={16} />
        </button>
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
                className={`media-item ${isActive ? "active" : ""} ${isUploading ? "uploading animate-pulse-border" : ""} ${draggedIndex === listIndex ? "dragging" : ""}`}
                onClick={() => onSelect(listIndex)}
                draggable={!isUploading}
                onDragStart={(e) => handleDragStart(e, listIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, listIndex)}
                onDragEnd={handleDragEnd}
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
                  ) : item.type === "youtube" ? (
                    <div className="video-thumbnail-container youtube-thumb">
                      <img
                        src={youtubeThumbnailUrl(item.videoId)}
                        alt={item.name}
                        className="sidebar-thumbnail"
                        loading="lazy"
                      />
                      <Video className="video-overlay-icon youtube-overlay-icon" size={16} />
                    </div>
                  ) : item.type === "audio" ? (
                    <div className="video-thumbnail-container audio-thumb">
                      <div className="sidebar-audio-placeholder">
                        <Music className="audio-placeholder-icon" size={20} />
                      </div>
                      <Music className="video-overlay-icon" size={16} />
                    </div>
                  ) : item.type === "document" ? (
                    <div className="video-thumbnail-container document-thumb">
                      <div className="sidebar-document-placeholder">
                        <FileText className="document-placeholder-icon" size={20} />
                      </div>
                      <File className="video-overlay-icon" size={16} />
                    </div>
                  ) : (
                    <div className="video-thumbnail-container">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="sidebar-thumbnail"
                          loading="lazy"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="sidebar-thumbnail"
                          preload="metadata"
                          muted
                        />
                      )}
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
                      {item.type === "image"
                        ? "Image"
                        : item.type === "youtube"
                          ? "YouTube"
                          : item.type === "audio"
                            ? "Audio"
                            : item.type === "document"
                              ? "Document"
                              : "Video"}
                      {item.size > 0 ? ` • ${formatSize(item.size)}` : item.isRemote ? " • Link" : ""}
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
    </aside>
  );
}
