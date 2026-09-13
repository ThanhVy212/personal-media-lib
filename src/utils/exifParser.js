function inBounds(data, offset, length) {
  return offset >= 0 && length > 0 && offset + length <= data.length;
}

function readUint16(data, offset, littleEndian) {
  if (!inBounds(data, offset, 2)) return null;
  if (littleEndian) {
    return data[offset] | (data[offset + 1] << 8);
  }
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data, offset, littleEndian) {
  if (!inBounds(data, offset, 4)) return null;
  if (littleEndian) {
    return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
  }
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

function readAscii(data, offset, length) {
  if (!inBounds(data, offset, length)) return null;
  let s = "";
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(data[offset + i]);
  }
  return s;
}

const TAG_TYPES = {
  1: { name: "Byte", size: 1 },
  2: { name: "Ascii", size: 1 },
  3: { name: "Short", size: 2 },
  4: { name: "Long", size: 4 },
  5: { name: "Rational", size: 8 },
  7: { name: "Undefined", size: 1 },
  9: { name: "SLong", size: 4 },
  10: { name: "SRational", size: 8 },
};

const EXIF_TAGS = {
  0x010f: "Camera Make",
  0x0110: "Camera Model",
  0x0112: "Orientation",
  0x011a: "X Resolution",
  0x011b: "Y Resolution",
  0x0131: "Software",
  0x0132: "Date Modified",
  0x0213: "YCbCr Positioning",
  0x8769: "Exif IFD Pointer",
  0x8825: "GPS IFD Pointer",
  0x829a: "Exposure Time",
  0x829d: "F-Number",
  0x8827: "ISO Speed",
  0x9000: "Exif Version",
  0x9003: "Date Original",
  0x9004: "Date Digitized",
  0x9201: "Shutter Speed",
  0x9202: "Aperture",
  0x9203: "Brightness",
  0x9204: "Exposure Bias",
  0x9207: "Max Aperture",
  0x9209: "Flash",
  0x920a: "Focal Length",
  0xa001: "Color Space",
  0xa002: "Pixel X Dimension",
  0xa003: "Pixel Y Dimension",
  0xa405: "Focal Length In 35mm Film",
  0xa420: "Image Unique ID",
  0xa430: "Camera Owner",
  0xa431: "Body Serial Number",
  0xa432: "Lens Info",
  0xa433: "Lens Make",
  0xa434: "Lens Model",
};

const GPS_TAGS = {
  0x0001: "GPS Latitude Ref",
  0x0002: "GPS Latitude",
  0x0003: "GPS Longitude Ref",
  0x0004: "GPS Longitude",
  0x0005: "GPS Altitude Ref",
  0x0006: "GPS Altitude",
  0x0007: "GPS Time Stamp",
  0x001d: "GPS Date Stamp",
};

function readIFDValue(data, entryOffset, type, count, littleEndian, tiffOffset) {
  const typeInfo = TAG_TYPES[type];
  if (!typeInfo) return null;

  if (!Number.isFinite(count) || count < 0) return null;

  const totalBytes = typeInfo.size * count;
  if (!Number.isFinite(totalBytes) || totalBytes < 0) return null;

  let valueOffset;
  if (totalBytes <= 4) {
    valueOffset = entryOffset + 8;
  } else {
    const rawOffset = readUint32(data, entryOffset + 4, littleEndian);
    if (rawOffset === null) return null;
    valueOffset = tiffOffset + rawOffset;
  }

  if (!Number.isFinite(valueOffset) || valueOffset < 0) return null;
  if (!inBounds(data, valueOffset, totalBytes)) return null;

  if (type === 2) {
    const str = readAscii(data, valueOffset, count > 0 ? count - 1 : 0);
    return str !== null ? str.trim() : null;
  }

  if (type === 3 && count === 1) {
    return readUint16(data, valueOffset, littleEndian);
  }

  if (type === 4 && count === 1) {
    return readUint32(data, valueOffset, littleEndian);
  }

  if (type === 5 && count === 1) {
    if (!inBounds(data, valueOffset, 8)) return null;
    const num = readUint32(data, valueOffset, littleEndian);
    const den = readUint32(data, valueOffset + 4, littleEndian);
    if (num === null || den === null) return null;
    return den === 0 ? num : num / den;
  }

  if (type === 5 && count === 3) {
    if (!inBounds(data, valueOffset, 24)) return null;
    const results = [];
    for (let i = 0; i < 3; i++) {
      const off = valueOffset + i * 8;
      const num = readUint32(data, off, littleEndian);
      const den = readUint32(data, off + 4, littleEndian);
      if (num === null || den === null) return null;
      results.push(den === 0 ? num : num / den);
    }
    return results;
  }

  if (type === 3 && count > 1) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const v = readUint16(data, valueOffset + i * 2, littleEndian);
      if (v === null) return null;
      results.push(v);
    }
    return results;
  }

  return null;
}

function parseIFD(data, offset, littleEndian, tagMap, tiffOffset) {
  const results = {};
  if (!inBounds(data, offset, 2)) return results;

  const count = readUint16(data, offset, littleEndian);
  if (count === null || count < 0 || count > 1000) return results;

  if (!inBounds(data, offset + 2, count * 12)) return results;

  for (let i = 0; i < count; i++) {
    const entryOffset = offset + 2 + i * 12;
    const tag = readUint16(data, entryOffset, littleEndian);
    const type = readUint16(data, entryOffset + 2, littleEndian);
    const count = readUint32(data, entryOffset + 4, littleEndian);
    if (tag === null || type === null || count === null) continue;

    const tagName = tagMap[tag];
    if (tagName) {
      const value = readIFDValue(data, entryOffset, type, count, littleEndian, tiffOffset);
      if (value !== null && value !== undefined) {
        results[tagName] = value;
      }
    }
  }

  return results;
}

function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length !== 3) return null;
  let decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === "S" || ref === "W") decimal = -decimal;
  return Math.round(decimal * 1000000) / 1000000;
}

function formatExposureTime(val) {
  if (val >= 1) return `${val}s`;
  const denom = Math.round(1 / val);
  return `1/${denom}s`;
}

function formatFNumber(val) {
  return `f/${val.toFixed(1)}`;
}

function formatFocalLength(val) {
  return `${Math.round(val)}mm`;
}

export async function extractExif(file) {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  let littleEndian = false;
  let exifData = {};

  while (offset < data.length - 1) {
    if (data[offset] !== 0xff) break;
    const marker = data[offset + 1];

    if (marker === 0xe1) {
      if (offset + 4 > data.length) break;
      const segmentLength = readUint16(data, offset + 2, false);
      if (segmentLength === null || segmentLength < 2) break;
      const segmentEnd = offset + 2 + segmentLength;
      if (segmentEnd > data.length) break;

      if (offset + 10 > data.length) break;
      const header = readAscii(data, offset + 4, 6);
      if (header === null) break;

      if (header.startsWith("Exif")) {
        const tiffOffset = offset + 10;
        if (tiffOffset + 8 > data.length) break;

        const byteOrder = readUint16(data, tiffOffset, false);
        if (byteOrder === null) break;
        littleEndian = byteOrder === 0x4949;

        const ifdOffset = readUint32(data, tiffOffset + 4, littleEndian);
        if (ifdOffset === null) break;

        const absIfdOffset = tiffOffset + ifdOffset;
        if (absIfdOffset < 0 || absIfdOffset >= data.length) break;

        const mainTags = parseIFD(data, absIfdOffset, littleEndian, EXIF_TAGS, tiffOffset);
        exifData = { ...exifData, ...mainTags };

        if (mainTags["Exif IFD Pointer"]) {
          const exifIFDOffset = tiffOffset + mainTags["Exif IFD Pointer"];
          if (exifIFDOffset >= 0 && exifIFDOffset < data.length) {
            const exifTags = parseIFD(data, exifIFDOffset, littleEndian, EXIF_TAGS, tiffOffset);
            exifData = { ...exifData, ...exifTags };
            delete exifData["Exif IFD Pointer"];
          }
        }

        if (mainTags["GPS IFD Pointer"]) {
          const gpsIFDOffset = tiffOffset + mainTags["GPS IFD Pointer"];
          if (gpsIFDOffset >= 0 && gpsIFDOffset < data.length) {
            const gpsTags = parseIFD(data, gpsIFDOffset, littleEndian, GPS_TAGS, tiffOffset);
            exifData = { ...exifData, ...gpsTags };
            delete exifData["GPS IFD Pointer"];
          }
        }

        break;
      }
      offset = segmentEnd;
    } else if (marker === 0xda) {
      break;
    } else {
      if (offset + 4 > data.length) break;
      const segmentLength = readUint16(data, offset + 2, false);
      if (segmentLength === null || segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  if (Object.keys(exifData).length === 0) return null;

  const result = {};

  if (exifData["Camera Make"]) result.cameraMake = exifData["Camera Make"];
  if (exifData["Camera Model"]) result.cameraModel = exifData["Camera Model"];
  if (exifData["Software"]) result.software = exifData["Software"];
  if (exifData["Date Original"]) result.dateOriginal = exifData["Date Original"];
  if (exifData["Date Digitized"]) result.dateDigitized = exifData["Date Digitized"];
  if (exifData["Date Modified"]) result.dateModified = exifData["Date Modified"];
  if (exifData["Exposure Time"]) result.exposureTime = formatExposureTime(exifData["Exposure Time"]);
  if (exifData["F-Number"]) result.fNumber = formatFNumber(exifData["F-Number"]);
  if (exifData["ISO Speed"]) result.iso = exifData["ISO Speed"];
  if (exifData["Focal Length"]) result.focalLength = formatFocalLength(exifData["Focal Length"]);
  if (exifData["Focal Length In 35mm Film"]) result.focalLength35mm = `${exifData["Focal Length In 35mm Film"]}mm equivalent`;
  if (exifData["Flash"]) result.flash = (exifData["Flash"] & 1) === 0 ? "No Flash" : "Flash Fired";
  if (exifData["Orientation"]) {
    const orientations = { 1: "Normal", 2: "Mirrored", 3: "Rotated 180°", 4: "Mirrored & Rotated 180°", 5: "Mirrored & Rotated 90° CCW", 6: "Rotated 90° CW", 7: "Mirrored & Rotated 90° CW", 8: "Rotated 90° CCW" };
    result.orientation = orientations[exifData["Orientation"]] || `Value ${exifData["Orientation"]}`;
  }
  if (exifData["Lens Make"]) result.lensMake = exifData["Lens Make"];
  if (exifData["Lens Model"]) result.lensModel = exifData["Lens Model"];
  if (exifData["Body Serial Number"]) result.serialNumber = exifData["Body Serial Number"];

  const lat = dmsToDecimal(exifData["GPS Latitude"], exifData["GPS Latitude Ref"]);
  const lng = dmsToDecimal(exifData["GPS Longitude"], exifData["GPS Longitude Ref"]);
  if (lat !== null && lng !== null) {
    result.gps = { lat, lng, url: `https://www.google.com/maps?q=${lat},${lng}` };
  }
  if (exifData["GPS Altitude"]) {
    const altRef = exifData["GPS Altitude Ref"];
    result.gpsAltitude = `${altRef === 1 ? "-" : ""}${Math.round(exifData["GPS Altitude"])}m`;
  }

  return Object.keys(result).length > 0 ? result : null;
}
