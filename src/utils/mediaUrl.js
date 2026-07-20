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
    const pathPart = normalized.split("/").pop()?.split("?")[0] || "Remote video";
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
