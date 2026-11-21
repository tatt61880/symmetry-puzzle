import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(import.meta.dirname, 'KosugiMaru-UI.woff2');
const cacheDir = path.join(root, '.cache/fonts');
const original = 'KosugiMaru-Regular.woff2';
const cache = path.join(cacheDir, original);
const stamp = path.join(cacheDir, 'subset.sha256');
const revision = 'bd22c671a9ffc10cc4313e6f2fd75f2b86d6b14b';
const sourceUrl = `https://raw.githubusercontent.com/googlefonts/kosugi-maru/${revision}/fonts/webfonts/${original}`;
const sourceHash = 'c58924a34635d222047d9875052b507c07e49d454226ec4fbbaa57fb475a7f07';

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function replaceFile(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

async function sourceFont() {
  if (fs.existsSync(cache)) {
    const data = fs.readFileSync(cache);
    if (sha256(data) === sourceHash) return data;
  }

  console.log('Downloading Kosugi Maru...');
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download Kosugi Maru (HTTP ${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  if (sha256(data) !== sourceHash) throw new Error('Downloaded font does not match the expected SHA-256.');
  fs.mkdirSync(cacheDir, { recursive: true });
  replaceFile(cache, data);
  return data;
}

function addSubsetDescription(font) {
  // WOFF2 header and extended metadata block: https://www.w3.org/TR/WOFF2/#Metadata
  if (font.readUInt32BE(28) !== 0 || font.readUInt32BE(40) !== 0) {
    throw new Error('Unexpected metadata or private block in the generated WOFF2.');
  }
  const xml = Buffer.from(
    '<metadata version="1.0"><description><text>Subset of Kosugi Maru for the Symmetry Puzzle UI.</text></description></metadata>'
  );
  const metadata = brotliCompressSync(xml);
  const padding = Buffer.alloc((4 - font.length % 4) % 4);
  const result = Buffer.concat([font, padding, metadata]);
  result.writeUInt32BE(result.length, 8);
  result.writeUInt32BE(font.length + padding.length, 28);
  result.writeUInt32BE(metadata.length, 32);
  result.writeUInt32BE(xml.length, 36);
  return result;
}

async function main() {
  const { decodeHTML } = await import('entities');
  const characters = new Set();
  for (let n = 0x20; n <= 0x7e; n++) characters.add(String.fromCodePoint(n));
  for (const file of fs.globSync(['index.html', 'src/*.js', 'css/*.css'], { cwd: root })) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const character of decodeHTML(source)) characters.add(character);
  }
  const text = [...characters].sort().join('');
  const inputsHash = createHash('sha256')
    .update(fs.readFileSync(import.meta.filename))
    .update(fs.readFileSync(path.join(root, 'package-lock.json')))
    .update(text)
    .digest('hex');
  const signature = (data) => `${inputsHash}\n${sha256(data)}\n`;
  if (fs.existsSync(output) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === signature(fs.readFileSync(output))) return;

  const { default: subsetFont } = await import('subset-font');
  const subset = await subsetFont(await sourceFont(), text, {
    targetFormat: 'woff2',
    preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 9, 12, 13, 14],
  });
  const data = addSubsetDescription(subset);
  replaceFile(output, data);
  replaceFile(stamp, signature(data));
  console.log(`Updated ${path.basename(output)}`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
    console.error('フォント生成用パッケージをインストールしてから再実行してください。\n  npm ci');
  }
  process.exitCode = 1;
}
