/**
 * Perceptual image hashing and similarity comparison utilities.
 * Uses DCT-based pHash algorithm to compare images by visual content,
 * not by filename or metadata.
 */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function getGrayscaleMatrix(img, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const matrix = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      row.push(gray);
    }
    matrix.push(row);
  }
  return matrix;
}

function dct(matrix) {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => Array(N).fill(0));

  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum +=
            matrix[x][y] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      result[u][v] = (2 / N) * cu * cv * sum;
    }
  }
  return result;
}

/**
 * Compute perceptual hash (pHash) for an image.
 * Returns a 64-bit hash as a BigInt.
 */
export async function computePHash(src, hashSize = 8) {
  const img = await loadImage(src);
  const matrixSize = hashSize + 8;
  const matrix = getGrayscaleMatrix(img, matrixSize);
  const dctMatrix = dct(matrix);

  // Extract low-frequency DCT coefficients (top-left corner)
  const lowFreq = [];
  for (let y = 0; y < hashSize; y++) {
    for (let x = 0; x < hashSize; x++) {
      lowFreq.push(dctMatrix[y][x]);
    }
  }

  // Calculate median
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Build hash: 1 if above median, 0 otherwise
  let hash = 0n;
  for (let i = 0; i < lowFreq.length; i++) {
    if (lowFreq[i] > median) {
      hash |= 1n << BigInt(i);
    }
  }
  return hash;
}

/**
 * Compute Hamming distance between two hashes.
 * Lower distance = more similar images.
 */
export function hammingDistance(hash1, hash2) {
  let xor = hash1 ^ hash2;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

/**
 * Compute similarity percentage between two hashes (0-100).
 */
export function similarityPercent(hash1, hash2) {
  const dist = hammingDistance(hash1, hash2);
  const totalBits = 64;
  return Math.round(((totalBits - dist) / totalBits) * 100);
}

/**
 * Compute hashes for all images in a media list.
 * Returns Map<id, hash>.
 */
export async function computeAllHashes(mediaList, onProgress) {
  const hashes = new Map();
  const images = mediaList.filter((m) => m.type === "image" && m.status === "completed");

  for (let i = 0; i < images.length; i++) {
    try {
      const hash = await computePHash(images[i].url);
      hashes.set(images[i].id, hash);
    } catch (err) {
      console.warn("Failed to compute hash for", images[i].name, err);
    }
    if (onProgress) {
      onProgress(i + 1, images.length);
    }
  }
  return hashes;
}

/**
 * Group similar images together using greedy clustering.
 * Returns an array of IDs reordered so similar images are adjacent.
 */
export function groupSimilarImages(mediaList, hashes, threshold = 5) {
  const images = mediaList.filter((m) => m.type === "image" && m.status === "completed");

  if (images.length <= 1) return mediaList;

  // Build adjacency: for each image, find most similar ungrouped images
  const visited = new Set();
  const groups = [];

  for (const img of images) {
    if (visited.has(img.id)) continue;
    const hash = hashes.get(img.id);
    if (hash === undefined) continue;

    const group = [img];
    visited.add(img.id);

    // Find all similar images (greedy BFS)
    const queue = [img];
    while (queue.length > 0) {
      const current = queue.shift();
      const currentHash = hashes.get(current.id);

      for (const candidate of images) {
        if (visited.has(candidate.id)) continue;
        const candidateHash = hashes.get(candidate.id);
        if (candidateHash === undefined) continue;

        if (hammingDistance(currentHash, candidateHash) <= threshold) {
          group.push(candidate);
          visited.add(candidate.id);
          queue.push(candidate);
        }
      }
    }

    groups.push(group);
  }

  // Sort groups: largest groups first, then by first item name
  groups.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a[0].name.localeCompare(b[0].name);
  });

  // Flatten groups into sorted list
  const sortedImages = groups.flat();

  // Merge back: non-images keep their relative order,
  // images are placed in similarity-sorted order
  const result = [];
  let imgIdx = 0;
  for (const item of mediaList) {
    if (item.type === "image" && item.status === "completed") {
      if (imgIdx < sortedImages.length) {
        result.push(sortedImages[imgIdx++]);
      }
    } else {
      result.push(item);
    }
  }

  // Append any remaining images (shouldn't happen but safety)
  while (imgIdx < sortedImages.length) {
    result.push(sortedImages[imgIdx++]);
  }

  return result;
}
