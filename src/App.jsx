import React, { useState, useEffect, useRef } from 'react';
import UploadZone from './components/UploadZone';
import Sidebar from './components/Sidebar';
import ImageViewer from './components/ImageViewer';
import VideoPlayer from './components/VideoPlayer';
import { Menu, FolderOpen, AlertCircle, FilePlus, Sparkles } from 'lucide-react';
import './App.css';

export default function App() {
  const [mediaList, setMediaList] = useState([]);
  const [activeIndex, setActiveIndex] = useState('upload');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Clean up object URLs on unmount to avoid browser memory leaks
  useEffect(() => {
    return () => {
      mediaList.forEach(item => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const showToast = (message, type = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleFilesSelected = (newFiles) => {
    const items = newFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      size: file.size
    }));

    setMediaList(prevList => {
      const updated = [...prevList, ...items];
      // If we are on the upload zone or nothing selected, select the first newly added item
      if (activeIndex === 'upload' || activeIndex === null) {
        setActiveIndex(prevList.length);
      }
      return updated;
    });

    showToast(`Added ${items.length} file${items.length > 1 ? 's' : ''} to library`, 'success');
  };

  const handleDelete = (indexToDelete) => {
    const item = mediaList[indexToDelete];
    if (item) {
      URL.revokeObjectURL(item.url);
    }

    const newList = mediaList.filter((_, i) => i !== indexToDelete);
    setMediaList(newList);

    if (newList.length === 0) {
      setActiveIndex('upload');
    } else if (indexToDelete === activeIndex) {
      // If we delete the active element, select the next available one
      setActiveIndex(Math.min(indexToDelete, newList.length - 1));
    } else if (indexToDelete < activeIndex) {
      // If we delete an element before the active index, shift index down
      setActiveIndex(activeIndex - 1);
    }

    showToast(`Removed "${item?.name || 'file'}"`, 'info');
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear the entire library? All files will be released from browser memory.")) {
      mediaList.forEach(item => {
        URL.revokeObjectURL(item.url);
      });
      setMediaList([]);
      setActiveIndex('upload');
      showToast("Library cleared", 'info');
    }
  };

  const handlePrev = () => {
    if (activeIndex !== 'upload' && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex !== 'upload' && activeIndex < mediaList.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const activeMedia = activeIndex !== null && activeIndex !== 'upload' ? mediaList[activeIndex] : null;

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
              const addBtn = document.querySelector('.add-btn');
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
          {activeIndex === 'upload' ? (
            <UploadZone onFilesSelected={handleFilesSelected} />
          ) : activeMedia ? (
            activeMedia.type === 'image' ? (
              <ImageViewer 
                src={activeMedia.url}
                name={activeMedia.name}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex !== 'upload' && activeIndex > 0}
                hasNext={activeIndex !== 'upload' && activeIndex < mediaList.length - 1}
              />
            ) : (
              <VideoPlayer 
                src={activeMedia.url}
                name={activeMedia.name}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex !== 'upload' && activeIndex > 0}
                hasNext={activeIndex !== 'upload' && activeIndex < mediaList.length - 1}
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

        @media (max-width: 600px) {
          .active-media-name-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
