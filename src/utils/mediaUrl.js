const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([\w-]{11})/i,
  /^https?:\/\/youtu\.be\/([\w-]{11})/i,
];

const DIRECT_VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export function extractYouTubeVideoId(url) {
  const trimmed = url.trim();
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * @returns {{ type: 'youtube' | 'video', url: string, videoId?: string, name: string } | null}
 */
export function parseMediaLink(raw) {
  const url = raw.trim();
  if (!url) return null;

  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    new URL(normalized);
  } catch {
    return null;
  }

  const videoId = extractYouTubeVideoId(normalized);
  if (videoId) {
    return {
      type: "youtube",
      url: normalized,
      videoId,
      name: `YouTube ${videoId}`,
    };
  }

  if (DIRECT_VIDEO_EXT.test(normalized)) {
    const pathPart =
      normalized.split("/").pop()?.split("?")[0] || "Remote video";
    return {
      type: "video",
      url: normalized,
      name: decodeURIComponent(pathPart),
    };
  }

  return null;
}

export function isBlobMediaUrl(url) {
  return typeof url === "string" && url.startsWith("blob:");
}

/**
 * Extracts a thumbnail image from a video URL/Blob URL.
 * @param {string} videoUrl
 * @returns {Promise<string>} Base64 Data URL of the video thumbnail
 */
export function generateVideoThumbnail(videoUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    // Set a timeout of 10s to avoid hanging if the video is unloadable
    const timeout = setTimeout(() => {
      video.src = "";
      video.load();
      reject(new Error("Thumbnail generation timed out"));
    }, 10000);

    video.onloadedmetadata = () => {
      // Seek to 1 second or half the duration, whichever is smaller, to avoid a black frame at the start
      const duration = video.duration;
      const seekTime = Number.isFinite(duration)
        ? Math.min(1.0, duration / 2)
        : 0.1;
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const width = 320;
        const height = video.videoWidth
          ? (video.videoHeight / video.videoWidth) * width
          : 180;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

        // Clean up
        video.src = "";
        video.load();

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
  });
}
