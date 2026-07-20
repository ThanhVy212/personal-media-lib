const STORAGE_KEY = "pml_openai_api_key";

export function getOpenAiApiKey() {
  const fromEnv = import.meta.env.VITE_OPENAI_API_KEY;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function setOpenAiApiKey(key) {
  try {
    if (key?.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

async function blobUrlToDataUrl(src, maxEdge = 2048) {
  const response = await fetch(src);
  const blob = await response.blob();

  if (blob.type === "image/png" || blob.type === "image/jpeg" || blob.type === "image/webp") {
    return resizeImageBlobToDataUrl(blob, maxEdge);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function resizeImageBlobToDataUrl(blob, maxEdge) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };
    img.src = objectUrl;
  });
}

const SYSTEM_PROMPT = `You are an expert comic and manga localizer translating English text into natural Vietnamese.
Analyze the image and find every readable text region (speech bubbles, captions, signs, SFX if meaningful).
Return ONLY valid JSON with this exact shape:
{"regions":[{"x":number,"y":number,"width":number,"height":number,"translated":string}]}
Coordinates x,y,width,height are percentages 0-100 of the full image (top-left origin).
Merge lines in the same bubble into one region when possible.
"translated" must be Vietnamese, faithful to tone and context (comedy, drama, etc.).
Skip empty or illegible areas. If no text, return {"regions":[]}.`;

/**
 * @param {string} imageSrc blob or data URL
 * @returns {Promise<Array<{ x: number, y: number, width: number, height: number, translated: string }>>}
 */
export async function translateImageRegions(imageSrc) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const dataUrl = await blobUrlToDataUrl(imageSrc);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Translate all English text in this page to Vietnamese. Return JSON regions with bounding boxes.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let message = `OpenAI API error (${response.status})`;
    try {
      const parsed = JSON.parse(errBody);
      message = parsed.error?.message || message;
    } catch {
      /* use default */
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from translation model");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON from translation model");
  }

  const regions = Array.isArray(parsed.regions) ? parsed.regions : [];
  return regions
    .filter(
      (r) =>
        r &&
        typeof r.translated === "string" &&
        r.translated.trim() &&
        Number.isFinite(Number(r.x)) &&
        Number.isFinite(Number(r.y)) &&
        Number.isFinite(Number(r.width)) &&
        Number.isFinite(Number(r.height)),
    )
    .map((r) => ({
      x: clampPercent(Number(r.x)),
      y: clampPercent(Number(r.y)),
      width: clampPercent(Number(r.width), 1, 100),
      height: clampPercent(Number(r.height), 1, 100),
      translated: r.translated.trim(),
    }));
}

function clampPercent(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
