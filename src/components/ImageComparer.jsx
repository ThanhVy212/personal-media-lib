import React, { useState, useEffect, useMemo } from "react";
import { X, Columns, Sliders, ArrowLeftRight } from "lucide-react";

export default function ImageComparer({ mediaList, onClose }) {
  const images = useMemo(
    () =>
      mediaList.filter(
        (item) => item.type === "image" && item.status === "completed",
      ),
    [mediaList],
  );

  const [imageAId, setImageAId] = useState(images[0]?.id || "");
  const [imageBId, setImageBId] = useState(
    images[1]?.id || images[0]?.id || "",
  );
  const [mode, setMode] = useState("slider"); // 'slider' or 'side-by-side'
  const [sliderPos, setSliderPos] = useState(50);

  // Sync available images if list changes
  useEffect(() => {
    if (images.length > 0) {
      if (!images.find((img) => img.id === imageAId)) {
        setImageAId(images[0].id);
      }
      if (!images.find((img) => img.id === imageBId)) {
        setImageBId(images[1]?.id || images[0].id);
      }
    }
  }, [images, imageAId, imageBId]);

  const imageA = images.find((img) => img.id === imageAId);
  const imageB = images.find((img) => img.id === imageBId);

  if (images.length < 2) {
    return (
      <div className="comparer-empty-state glassmorphism animate-fade-in">
        <Sliders size={48} className="logo-icon animate-pulse" />
        <h3>Cần ít nhất 2 ảnh để so sánh</h3>
        <p>
          Vui lòng upload thêm ảnh vào thư viện của bạn trước khi sử dụng tính
          năng này.
        </p>
        <button className="btn btn-secondary mt-4" onClick={onClose}>
          <X size={16} /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="image-comparer-container animate-fade-in">
      {/* Header bar of comparison */}
      <div className="comparer-header glassmorphism">
        <div className="comparer-selectors">
          <div className="selector-group">
            <label className="selector-label" htmlFor="compare-image-a">
              Ảnh A:
            </label>
            <select
              id="compare-image-a"
              value={imageAId}
              onChange={(e) => setImageAId(e.target.value)}
              className="comparer-select"
            >
              {images.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-icon btn-secondary swap-btn"
            title="Đổi chỗ 2 ảnh"
            onClick={() => {
              const temp = imageAId;
              setImageAId(imageBId);
              setImageBId(temp);
            }}
          >
            <ArrowLeftRight size={16} />
          </button>

          <div className="selector-group">
            +{" "}
            <label className="selector-label" htmlFor="compare-image-b">
              Ảnh B:
            </label>
            <select
              id="compare-image-b"
              value={imageBId}
              onChange={(e) => setImageBId(e.target.value)}
              className="comparer-select"
            >
              {images.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="comparer-controls">
          <button
            className={`btn btn-secondary ${mode === "slider" ? "btn-active-tab" : ""}`}
            onClick={() => setMode("slider")}
          >
            <Sliders size={16} />
            <span>Slider</span>
          </button>
          <button
            className={`btn btn-secondary ${mode === "side-by-side" ? "btn-active-tab" : ""}`}
            onClick={() => setMode("side-by-side")}
          >
            <Columns size={16} />
            <span>Song song</span>
          </button>
          <div className="controls-separator"></div>
          <button
            className="btn btn-icon btn-secondary close-btn"
            onClick={onClose}
            title="Đóng so sánh"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="comparer-viewport">
        {mode === "side-by-side" ? (
          <div className="compare-side-by-side-layout">
            <div className="compare-pane">
              <div className="pane-tag tag-a">Ảnh A</div>
              <div className="compare-image-wrapper">
                {imageA && (
                  <img
                    src={imageA.url}
                    alt={imageA.name}
                    className="compare-img-fit"
                  />
                )}
              </div>
              <span className="pane-name">{imageA?.name}</span>
            </div>
            <div className="compare-pane">
              <div className="pane-tag tag-b">Ảnh B</div>
              <div className="compare-image-wrapper">
                {imageB && (
                  <img
                    src={imageB.url}
                    alt={imageB.name}
                    className="compare-img-fit"
                  />
                )}
              </div>
              <span className="pane-name">{imageB?.name}</span>
            </div>
          </div>
        ) : (
          <div className="compare-slider-layout">
            <div className="slider-wrapper-inner">
              {/* Image A (Before) - Base layer */}
              {imageA && (
                <img
                  src={imageA.url}
                  alt={imageA.name}
                  className="slider-img slider-img-a"
                  draggable={false}
                />
              )}
              <div className="pane-tag tag-a absolute-tag">Ảnh A</div>

              {/* Image B (After) - Overlay layer */}
              {imageB && (
                <div
                  className="slider-overlay-pane"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={imageB.url}
                    alt={imageB.name}
                    className="slider-img slider-img-b"
                    draggable={false}
                  />
                  <div className="pane-tag tag-b absolute-tag">Ảnh B</div>
                </div>
              )}

              {/* Slider Line Divider & Drag Handle */}
              <div
                className="slider-divider-line"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="slider-divider-handle">
                  <ArrowLeftRight size={16} className="text-white" />
                </div>
              </div>

              {/* Transparent Slider Input overlay */}
              <input
                type="range"
                aria-label="Vị trí so sánh"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="compare-slider-range"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
