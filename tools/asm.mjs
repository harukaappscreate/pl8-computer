#!/usr/bin/env node

// PL-8 Orthogonal 16-bit Instruction Word Assembler & Architecture Simulator
// Word = [ hi: (op<<3)|r , lo: a ], PC = 0..255 (up to 256 words = 512B per ROM)
// Author: haruka_apps

import fs from 'fs';

export function assemble(src) {
  const lines = src.split('\n').map((l) => l.replace(/;.*$/, '').trim()).filter(Boolean);
  const labels = {}, consts = {}, parsed = [];
  const reg = (t) => { const m = /^R([0-7])$/i.exec(t); if (!m) throw new Error('Bad reg: ' + t); return +m[1]; };
  const val = (t) => {
    t = t.trim();
    if (t in consts) return consts[t];
    if (t in labels) return labels[t];
    if (/^\$[0-9a-f]+$/i.test(t)) return parseInt(t.slice(1), 16);
    if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t.slice(2), 16);
    if (/^-?\d+$/.test(t)) return +t;
    throw new Error('Unknown val: ' + t);
  };

  let pc = 0;
  for (const line of lines) {
    if (line.includes('=')) { const [k, v] = line.split('=').map((s) => s.trim()); consts[k] = val(v); continue; }
    if (line.endsWith(':')) { labels[line.slice(0, -1).trim()] = pc; continue; }
    const [mnRaw, ...rest] = line.split(/\s+/);
    parsed.push({ mn: mnRaw.toUpperCase(), args: rest.join('').split(',').map((s) => s.trim()).filter(Boolean) });
    pc++;
  }
  if (pc > 256) throw new Error(`ROM exceeds 256 words: ${pc}`);

  const hi = [], lo = [];
  const push = (op, r, a) => { hi.push((op << 3) | (r & 7)); lo.push(a & 255); };
  for (const { mn, args } of parsed) {
    if (mn === 'LDI') push(0, reg(args[0]), val(args[1]));
    else if (mn === 'LD') push(1, reg(args[0]), val(args[1].replace(/[\[\]]/g, '')));
    else if (mn === 'LDR') push(1, reg(args[0]), 255);
    else if (mn === 'ST') push(2, reg(args[1]), val(args[0].replace(/[\[\]]/g, '')));
    else if (mn === 'STR') push(2, reg(args[args.length - 1]), 255);
    else if (mn === 'ADI') push(3, reg(args[0]), val(args[1]));
    else if (mn === 'INC') push(3, reg(args[0]), 1);
    else if (mn === 'DEC') push(3, reg(args[0]), 255);
    else if (mn === 'CPI') push(4, reg(args[0]), val(args[1]));
    else if (mn === 'ANI') push(5, reg(args[0]), val(args[1]));
    else if (['MOV', 'ADD', 'ADC', 'SUB', 'SBC', 'CMP', 'AND', 'XOR', 'OR'].includes(mn)) {
      const k = ['MOV', 'ADD', 'ADC', 'SUB', 'SBC', 'CMP', 'AND', 'XOR', 'OR'].indexOf(mn);
      push(6, reg(args[0]), (k << 4) | reg(args[1]));
    } else if (['SHL', 'ROL', 'SHR', 'ROR'].includes(mn)) {
      push(7, reg(args[0]), ['SHL', 'ROL', 'SHR', 'ROR'].indexOf(mn));
    } else if (['JMP', 'JZ', 'JNZ', 'JC', 'JNC'].includes(mn)) {
      push(8 + ['JMP', 'JZ', 'JNZ', 'JC', 'JNC'].indexOf(mn), 0, val(args[0]));
    } else if (mn === 'DJNZ') push(13, reg(args[0]), val(args[1]));
    else if (mn === 'CALL') push(14, 0, val(args[0]));
    else if (mn === 'WFI') push(15, 0, 0);
    else if (mn === 'RET') push(15, 1, 0);
    else if (mn === 'PSH') push(15, 2, reg(args[0]));
    else if (mn === 'POP') push(15, 3, reg(args[0]));
    else if (mn === 'CLS') push(15, 4, 0);
    else if (mn === 'RECT') push(15, 5, val(args[0]));
    else if (mn === 'CLR') push(15, 5, args[0] ? val(args[0]) : 0);
    else if (mn === 'ROW') push(15, 6, val(args[0]));
    else if (mn === 'PUTC') push(15, 7, reg(args[0]));
    else throw new Error('Unknown mn: ' + mn);
  }
  return new Uint8Array([...hi, ...lo]);
}

export function encodeHex(planar) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return Array.from(planar).map(toHex).join('');
}

// CLI entry point
const file = process.argv[2];
if (file) {
  try {
    const src = fs.readFileSync(file, 'utf8');
    const planar = assemble(src);
    const words = planar.length / 2;
    const hex = encodeHex(planar);
    console.log(`Assembled ${file}: ${words} words (${planar.length} bytes)`);
    console.log('Hex representation:');
    console.log(hex);
  } catch (e) {
    console.error('Assembly error:', e.message);
    process.exit(1);
  }
}
