import React, { useState, useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./TooFast.css";

export default function TooFast() {
  const [countdown, setCountdown] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="toofast-container">
      <div className="toofast-card glassmorphism animate-fade-in">
        <div className="toofast-icon-container">
          <AlertTriangle className="toofast-icon" size={36} />
        </div>

        <h1 className="toofast-title">Slow down there, speedy!</h1>

        <p className="toofast-message">
          Looks like you've been a little too eager. We've put a temporary pause
          on your excitement. Chill for a bit, and try again shortly.
        </p>

        <div className="toofast-timer">
          <div className="toofast-timer-ring">
            <svg viewBox="0 0 100 100">
              <circle className="timer-bg" cx="50" cy="50" r="44" />
              <circle
                className="timer-fg"
                cx="50"
                cy="50"
                r="44"
                strokeDasharray="276.46"
                strokeDashoffset={
                  276.46 - (276.46 * countdown) / 30
                }
              />
            </svg>
            <span className="toofast-countdown">{countdown}</span>
          </div>
          <p className="toofast-timer-text">
            {countdown > 0
              ? `Try again in ${countdown}s`
              : "You're good to go!"}
          </p>
        </div>

        <button
          className="btn btn-primary toofast-back-btn"
          onClick={handleGoBack}
          disabled={countdown > 0}
        >
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
}
