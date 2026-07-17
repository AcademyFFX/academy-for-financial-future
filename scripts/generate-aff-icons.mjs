import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const navy = [10, 24, 51, 255];
const gold = [212, 175, 55, 255];
const cream = [247, 243, 235, 255];
const transparent = [0, 0, 0, 0];

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makePng(size) {
  const pixels = Array.from({ length: size }, () => Array.from({ length: size }, () => [...transparent]));
  const scale = size / 96;

  function set(x, y, color) {
    if (x >= 0 && x < size && y >= 0 && y < size) pixels[y][x] = [...color];
  }

  function rect(x, y, width, height, color) {
    for (let row = Math.round(y * scale); row < Math.round((y + height) * scale); row += 1) {
      for (let col = Math.round(x * scale); col < Math.round((x + width) * scale); col += 1) set(col, row, color);
    }
  }

  function roundedRect(x, y, width, height, radius, color) {
    const sx = Math.round(x * scale);
    const sy = Math.round(y * scale);
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);
    const sr = radius * scale;
    for (let row = sy; row < sy + sh; row += 1) {
      for (let col = sx; col < sx + sw; col += 1) {
        const dx = Math.max(sx + sr - col, 0, col - (sx + sw - sr));
        const dy = Math.max(sy + sr - row, 0, row - (sy + sh - sr));
        if (dx * dx + dy * dy <= sr * sr) set(col, row, color);
      }
    }
  }

  function strokeRect(x, y, width, height, thickness, color) {
    rect(x, y, width, thickness, color);
    rect(x, y + height - thickness, width, thickness, color);
    rect(x, y, thickness, height, color);
    rect(x + width - thickness, y, thickness, height, color);
  }

  function line(x1, y1, x2, y2, thickness, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * scale * 2;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = (x1 + (x2 - x1) * t) * scale;
      const y = (y1 + (y2 - y1) * t) * scale;
      const r = Math.max(1, Math.round((thickness * scale) / 2));
      for (let row = Math.round(y) - r; row <= Math.round(y) + r; row += 1) {
        for (let col = Math.round(x) - r; col <= Math.round(x) + r; col += 1) set(col, row, color);
      }
    }
  }

  function glyph(pattern, x, y, cell, color) {
    pattern.forEach((row, rowIndex) => {
      [...row].forEach((value, colIndex) => {
        if (value === "1") rect(x + colIndex * cell, y + rowIndex * cell, cell, cell, color);
      });
    });
  }

  roundedRect(0, 0, 96, 96, 18, navy);
  strokeRect(7, 7, 82, 82, 3, gold);
  line(48, 14, 75, 27, 3, gold);
  line(75, 27, 75, 47, 3, gold);
  line(75, 47, 48, 83, 3, gold);
  line(48, 83, 21, 47, 3, gold);
  line(21, 47, 21, 27, 3, gold);
  line(21, 27, 48, 14, 3, gold);

  const a = ["01110", "10001", "10001", "11111", "10001", "10001", "10001"];
  const f = ["11111", "10000", "10000", "11110", "10000", "10000", "10000"];
  glyph(a, 25, 34, 3.4, gold);
  glyph(f, 43, 34, 3.4, gold);
  glyph(f, 60, 34, 3.4, gold);
  line(30, 65, 66, 65, 3, cream);
  line(36, 73, 60, 73, 2, gold);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, aValue] = pixels[y][x];
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = aValue;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

writeFileSync("public/favicon-16x16.png", makePng(16));
writeFileSync("public/favicon-32x32.png", makePng(32));
writeFileSync("public/apple-touch-icon.png", makePng(180));
