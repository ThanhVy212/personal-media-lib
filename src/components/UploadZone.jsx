import React, { useState, useRef } from 'react';
import { Upload, Image, Video, FileText, Link2, Music, File } from 'lucide-react';

export default function UploadZone({ onFilesSelected, onAddMediaLink, mediaList = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [linkInput, setLinkInput] = useState('');
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
    
    const mediaFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/') ||
        file.type === 'application/pdf' ||
        file.type === 'text/plain' ||
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.pdf')
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
    e.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    onAddMediaLink?.(linkInput);
    setLinkInput('');
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
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
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
          <span className="info-tag">
            <Music size={14} /> Audio (MP3, WAV)
          </span>
          <span className="info-tag">
            <File size={14} /> Documents (PDF, DOC, TXT)
          </span>
        </div>

        <div className="security-notice">
          <FileText size={12} />
          <span>Files stay local in the browser. Translation sends the image to OpenAI; video links stream from their source.</span>
        </div>
      </div>

      <form className="media-link-card glassmorphism" onSubmit={handleAddLink}>
        <div className="media-link-header">
          <Link2 size={18} />
          <h3>Thêm link video</h3>
        </div>
        <p className="media-link-desc">
          YouTube (watch, Shorts, youtu.be) hoặc file video trực tiếp (.mp4, .webm).
        </p>
        <div className="media-link-row">
          <Video size={18} className="media-link-yt-icon" />
          <input
            type="url"
            className="media-link-input"
            placeholder="https://www.youtube.com/watch?v=…"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Thêm
          </button>
        </div>
      </form>

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
