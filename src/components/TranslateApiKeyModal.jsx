import React, { useState } from "react";
import { X, KeyRound } from "lucide-react";
import { getOpenAiApiKey, setOpenAiApiKey } from "../utils/openaiTranslate.js";

export default function TranslateApiKeyModal({ onClose, onSaved }) {
  const [value, setValue] = useState(() => getOpenAiApiKey());

  const handleSave = () => {
    setOpenAiApiKey(value);
    onSaved?.();
    onClose();
  };

  return (
    <div className="translate-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="translate-modal glassmorphism"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="translate-api-title"
      >
        <div className="translate-modal-header">
          <KeyRound size={20} />
          <h3 id="translate-api-title">OpenAI API key</h3>
          <button type="button" className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p className="translate-modal-desc">
          Dịch ảnh dùng <strong>GPT-4o Vision</strong> để nhận chữ và dịch sang tiếng Việt chính xác
          (phù hợp truyện tranh). Ảnh được gửi tới OpenAI khi bạn bấm Dịch. Key lưu trên trình duyệt
          của bạn (hoặc <code>VITE_OPENAI_API_KEY</code> khi build).
        </p>
        <input
          type="password"
          className="translate-api-input"
          placeholder="sk-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        <div className="translate-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
