#!/usr/bin/env node

// PL-8 Microcomputer Build & Verification Tool
// Author: haruka_apps

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { assemble } from './asm.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

console.log('=== PL-8 Microcomputer Verification & Build ===\n');

// Nibble-aligned relative branch encoder (PL-8 Cartridge v2/v4 encoding)
function encodeV2(asm) {
  const r = assemble(asm), n = r.length >> 1, out = Buffer.alloc(r.length);
  for (let i = 0; i < n; i++) {
    const op = r[i] >> 3, reg = r[i] & 7;
    out[i] = (op << 4) | reg;
    out[n + i] = op >= 8 && op <= 14 ? (r[n + i] - i) & 255 : r[n + i];
  }
  return out.toString('hex');
}

// 1. Assemble CALC-16
const calcSrc = fs.readFileSync(path.join(ROOT, 'roms', 'calc.asm'), 'utf8');
const calcPlanar = assemble(calcSrc);
const calcWords = calcPlanar.length / 2;
const calcHex = encodeV2(calcSrc);
console.log(`[ROM 0] CALC-16: ${calcWords} words (${calcPlanar.length} bytes)`);

// 2. Assemble BRICK
const brickSrc = fs.readFileSync(path.join(ROOT, 'roms', 'brick.asm'), 'utf8');
const brickPlanar = assemble(brickSrc);
const brickWords = brickPlanar.length / 2;
const brickHex = encodeV2(brickSrc);
console.log(`[ROM 1] BRICK:   ${brickWords} words (${brickPlanar.length} bytes)`);

console.log(`Total ROM words: ${calcWords + brickWords} words (${calcPlanar.length + brickPlanar.length} bytes)\n`);

// 3. Inspect Cartridge Source
const cartSrcPath = path.join(ROOT, 'src', 'pl8-cartridge.src.js');
const cartSrc = fs.readFileSync(cartSrcPath, 'utf8');
const hexMatch = cartSrc.match(/const RH\s*=\s*'([^']+)'\.split\(','\)/i);

if (hexMatch) {
  const [embeddedCalc, embeddedBrick] = hexMatch[1].split(',');
  const calcMatch = embeddedCalc === calcHex;
  const brickMatch = embeddedBrick === brickHex;
  if (calcMatch && brickMatch) {
    console.log('✔ Embedded ROM hex in src/pl8-cartridge.src.js matches assembled ROMs perfectly!');
  } else {
    console.error('✖ Embedded ROM hex differs from freshly assembled ROMs:');
    if (!calcMatch) console.error('  - CALC-16 hex mismatch');
    if (!brickMatch) console.error('  - BRICK hex mismatch');
    process.exitCode = 1;
  }
}

// 4. Verify Minified Bundle Size
const minPath = path.join(ROOT, 'dist', 'pl8-cartridge.min.js');
if (fs.existsSync(minPath)) {
  const minCode = fs.readFileSync(minPath);
  const deflated = zlib.deflateRawSync(minCode, { level: 9 });
  const b64 = deflated.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = `https://kitao.dev/playload/app/#v1.${b64}`;

  const kib = (deflated.length / 1024).toFixed(2);
  const budget = 3072;
  const margin = budget - deflated.length;

  console.log('\n--- Production Cartridge Metrics ---');
  console.log(`Minified JS:     ${minCode.length} characters`);
  console.log(`Deflate-raw:     ${deflated.length} bytes (${kib} KiB / 3.00 KiB)`);

  if (deflated.length <= budget) {
    console.log(`Remaining margin: ${margin} bytes under 3 KB limit`);
    console.log(`Playload URL:    ${url.slice(0, 60)}...`);
    console.log(`✔ Payload meets Playload 0.9.5 requirements!\n`);
  } else {
    console.error(`✖ OVER THE 3 KB LIMIT (+${deflated.length - budget} bytes)\n`);
    process.exitCode = 1;
  }
}
