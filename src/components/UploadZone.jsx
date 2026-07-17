import React, { useState, useRef } from 'react';
import { Upload, Image, Video, FileText } from 'lucide-react';

export default function UploadZone({ onFilesSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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

      <style>{`
        .upload-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 24px;
          background: radial-gradient(circle at center, var(--bg-card) 0%, var(--bg-darker) 100%);
        }

        .upload-card {
          width: 100%;
          max-width: 560px;
          padding: 48px 32px;
          border-radius: 20px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          background: rgba(24, 27, 40, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          text-align: center;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: var(--shadow-lg);
          position: relative;
        }

        .upload-card:hover {
          border-color: var(--primary);
          background: rgba(24, 27, 40, 0.8);
          transform: translateY(-2px);
        }

        .upload-card.dragging {
          border-color: var(--accent);
          background: rgba(6, 182, 212, 0.05);
          transform: scale(1.02);
          box-shadow: 0 0 25px rgba(6, 182, 212, 0.2);
        }

        .hidden-input {
          display: none;
        }

        .upload-icon-container {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-light);
          border-radius: 20px;
          margin-bottom: 24px;
          color: var(--primary);
          transition: var(--transition-smooth);
        }

        .upload-card:hover .upload-icon-container {
          color: var(--primary-hover);
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 15px rgba(124, 58, 237, 0.2);
        }

        .upload-main-icon {
          width: 32px;
          height: 32px;
        }

        .decorations {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        .decor-icon {
          position: absolute;
          width: 18px;
          height: 18px;
          color: var(--text-muted);
          opacity: 0.5;
          transition: var(--transition-smooth);
        }

        .decor-image {
          top: -8px;
          right: -8px;
          transform: rotate(15deg);
        }

        .decor-video {
          bottom: -8px;
          left: -8px;
          transform: rotate(-15deg);
        }

        .upload-card:hover .decor-image {
          transform: translate(4px, -4px) rotate(25deg);
          color: var(--primary);
          opacity: 0.8;
        }

        .upload-card:hover .decor-video {
          transform: translate(-4px, 4px) rotate(-25deg);
          color: var(--accent);
          opacity: 0.8;
        }

        .upload-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 12px;
          letter-spacing: -0.025em;
        }

        .upload-description {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 360px;
          margin-bottom: 32px;
        }

        .upload-description .highlight {
          color: var(--primary-hover);
          font-weight: 600;
          text-decoration: underline;
        }

        .info-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 24px;
        }

        .info-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: 9999px;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          width: 100%;
          padding-top: 24px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}
