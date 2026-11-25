// 生成 LifeOS PWA 图标（纯 Node + zlib，无原生依赖）
// 画一个青色圆角方块背景 + 白色表盘环 + 青色中心点，寓意“生活节奏”。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---- CRC32 表 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // 每行前置 filter byte = 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function makeIcon(size, { maskable }) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerR = maskable ? 0 : size * 0.22;
  const scale = maskable ? 0.74 : 1.0;
  const rOuter = size * 0.3 * scale;
  const rInner = size * 0.205 * scale;
  const dotR = size * 0.055 * scale;
  const tickR1 = rInner * 0.55;
  const tickR2 = rOuter * 0.92;
  const bg = [15, 118, 110];
  const ring = [232, 244, 240];
  const dot = [45, 212, 191];
  const tick = [232, 244, 240];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let r = bg[0], g = bg[1], b = bg[2], a = 255;

      if (!maskable) {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const half = size / 2;
        if (ax > half - cornerR && ay > half - cornerR) {
          const cdx = ax - (half - cornerR);
          const cdy = ay - (half - cornerR);
          if (Math.sqrt(cdx * cdx + cdy * cdy) > cornerR) a = 0;
        }
      }

      if (a !== 0) {
        if (dist <= rOuter && dist >= rInner) {
          r = ring[0]; g = ring[1]; b = ring[2];
        } else if (dist <= dotR) {
          r = dot[0]; g = dot[1]; b = dot[2];
        } else if (Math.abs(dx) <= size * 0.012 && dy <= 0 && dist >= tickR1 && dist <= tickR2) {
          // 12 点方向的表针
          r = tick[0]; g = tick[1]; b = tick[2];
        }
      }

      const idx = (y * size + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

const specs = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'maskable-512.png', size: 512, maskable: true },
  { name: 'apple-180.png', size: 180, maskable: false }
];

for (const s of specs) {
  const png = encodePNG(s.size, makeIcon(s.size, { maskable: s.maskable }));
  writeFileSync(join(outDir, s.name), png);
  console.log(`generated ${s.name} (${s.size}x${s.size}, ${png.length} bytes)`);
}
console.log('icons written to public/icons/');
