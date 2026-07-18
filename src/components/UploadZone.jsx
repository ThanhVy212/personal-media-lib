import React, { useState, useRef } from 'react';
import { Upload, Image, Video, FileText } from 'lucide-react';

export default function UploadZone({ onFilesSelected, mediaList = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const uploadingFiles = mediaList.filter((item) => item.status === "uploading");

  const processFiles = (files) => {
    if (!files || files.length === 0) return;
    
    // Filter for images and videos
    const mediaFiles = Array.from(files).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (mediaFiles.length > 0) {
      onFilesSelected(mediaFiles);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
    // Reset value to allow selecting the same file again
    e.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-screen">
      <div 
        className={`upload-card ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple 
          accept="image/*,video/*"
          className="hidden-input"
        />
        
        <div className="upload-icon-container">
          <Upload className="upload-main-icon" />
          <div className="decorations">
            <Image className="decor-icon decor-image" />
            <Video className="decor-icon decor-video" />
          </div>
        </div>

        <h2 className="upload-title">Personal Media Library</h2>
        <p className="upload-description">
          Drag and drop your photos and videos here, or <span className="highlight">browse</span> your device.
        </p>
        
        <div className="info-tags">
          <span className="info-tag">
            <Image size={14} /> Images (JPG, PNG, GIF, WEBP)
          </span>
          <span className="info-tag">
            <Video size={14} /> Videos (MP4, WEBM, MOV)
          </span>
        </div>

        <div className="security-notice">
          <FileText size={12} />
          <span>All processing is done entirely in your browser. No files are uploaded to any server.</span>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="active-uploads-container animate-fade-in glassmorphism">
          <div className="uploads-header">
            <h3>Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}...</h3>
            <span className="upload-loader-pulse"></span>
          </div>
          <div className="uploads-list">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="upload-item">
                <div className="upload-item-info">
                  <span className="upload-item-name" title={file.name}>{file.name}</span>
                  <span className="upload-item-meta">
                    {formatSize(file.size)} • {file.speed} MB/s
                  </span>
                </div>
                <div className="upload-item-progress-container">
                  <div className="upload-item-progress-bar">
                    <div 
                      className="upload-item-progress-fill" 
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <span className="upload-item-percentage">{Math.round(file.progress)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
