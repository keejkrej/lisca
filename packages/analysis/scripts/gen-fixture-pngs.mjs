import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, r, g, b) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const colors = {
  traces: [96, 165, 250],
  traces_summary: [59, 130, 246],
  area: [52, 211, 153],
  auc: [251, 191, 36],
  mrna_lifetime: [167, 139, 250],
  expression_rate: [244, 114, 182],
  onset_time: [248, 113, 113],
  traces_fit: [125, 211, 252],
  kill_curve: [45, 212, 191],
  death_times: [251, 146, 60],
};

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "../src/fixtures/png");
mkdirSync(dir, { recursive: true });
const urls = {};
for (const [name, [r, g, b]] of Object.entries(colors)) {
  const buf = png(480, 270, r, g, b);
  writeFileSync(join(dir, `${name}.png`), buf);
  urls[name] = `data:image/png;base64,${buf.toString("base64")}`;
}
writeFileSync(join(dir, "data-urls.json"), JSON.stringify(urls, null, 2));
console.log(`wrote ${Object.keys(urls).length} pngs to ${dir}`);
