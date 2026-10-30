// @title PL-8 CPU
// A real 8-bit CPU: every add/sub/compare runs through a gate-level ripple-carry adder.
// Machine-code ROMs: CALC (16-bit calculator) / BRICK — by haruka_apps
const RH = 'f40020073720a0e0f016900020560020469046c046901020102026002020e08010a010a0f4200020202030201141b010e06002612021e0e080109006e06500202020302010111213459045904590646490e0202166669041b0e020e020e007e0103020806061e0800700203747a00002806061b0806061b002036263606104248064650001067372c06061b07475d62021e0000220228070716465707170716061f10405067071747565a064c0646530d6f1e0070203e0244790376464a014900424042447903704243747a0f11444b005f724f10405f51011040567e067e00406057071c005f580f534d61011f16676767676e0665646c036f7f10000fe08fffffeab00f1fe00f10f12fc0fef0a0d0e240200030104000506afe9050b040300070002030601050304da02671600220203977bd004ce0e91000004050601fe000102030a280b2a0c3402831851020304853b04390bf609f777f555f580f52f0405313bf70bfffff1fd0306241223f51b32431800003041020301060f00010000100203041425dd0001f8020321001afefc7200010001000100011425000000100001010153025204324301f50022f70a00ecfff213ff0081f706080aff0006f207ff0ffffff1fd0007390401060700000b000203100c0112001000101c0001041637023104f7020300070202020203070f0a02060600,00200020e000202000202020002020202000202010a0105090002080101261519042c0322261519042b032221190123222022250900222022280100160209010116040c040b02080026222022210116040c02080022202221040a01131126141b0022202221050900240a002800241b0022202228040c011312102220222e0801040c040b030625242c0707007671602117171719072d16363906626120363230121e01011601160a0002080103040c00011312120f1f407050613040273c0f534d23735d61405f51415f5f08010a000200020f11a000309c90ff4f500f6f70bff060708040105030907f010b318fce5f0000004050203fe0000080532030200050d0005011a021082000514fc7d0b01710b7801031101053e0301060031030cfc0204110103020501040efc021b1b010100320d15ff041a02f00c06020407fe05010602ff0312fc421f0a09ff09010504fc4f370203340e32fd0003022d02020610ff01010202020300ff06621d72ff040032041afc0a06078108810e22fc61f7010a0500f601f6f70000060303ff000802027208fc0104f6001dc2010222004809020bf20af300'.split(',');
const SPN = ['STEP', '15Hz', '240Hz', '4kHz', '27kHz'];
const SEG = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111, 64, 121];
const KL = '789÷456×123-C0=+';
const hx = (v) => (v | 256).toString(16).slice(1).toUpperCase();
// built-in 8x8 font reused as the LCD character ROM (0 bytes of font data)
let HI = [], LO = [], M = [], R = [], V = [], ri = 1, sp, PC, S, Z, C, A, B, CY, LR, LM, BA, Y, L = 165, T = 0, kx = 2, ky = 2, fl, demo = 1;

// gate-level 8-bit ripple-carry full adder: sum = x^y^c, carry = x&y | (x^y)&c
const add = (x, y, c) => {
  let o = 0, b = 0, p, q;
  A = x;
  B = y &= 255;
  CY = 0;
  for (; b < 8; b++) {
    p = (x >> b) & 1;
    q = (y >> b) & 1;
    o |= (p ^ q ^ c) << b;
    CY |= (c = (p & q) | ((p ^ q) & c)) << b;
  }
  Z = !o;
  C = c;
  BA |= 2;
  return o;
};
const set = (r, v) => ((Z = !(R[r] = v)), (LR = r));
const plot = (x, y, on, i = y * 8 + (x >> 3), m = 128 >> (x & 7)) => x < 64 && y < 32 && (V[i] = on ? V[i] | m : V[i] & ~m);
const rd = (a) => ((LM = a), (BA |= 1), a == 253 ? (M[a] = L = (L >> 1) ^ (L & 1 && 184)) : M[a]);
const wr = (a, v) => ((LM = a), (BA |= 4), (M[a] = v));
const load = (i) => {
  const h = RH[(ri = i)], n = h.length / 4;
  for (let j = 256; j--; ) (HI[j] = j < n && +('0x' + h.substr(j * 2, 2))), (LO[j] = +('0x' + h.substr(n * 2 + j * 2, 2)) | 0), (M[j] = (j > 241) & (j < 248) && 15), (V[j] = 0);
  for (let j = 8; j--; ) R[j] = 0;
  PC = Z = C = 0;
  S = 239;
  LR = -1;
  sp = i ? 4 : 3;
};

const step = () => {
  const h = HI[PC], a = LO[PC], o = h >> 4, r = h & 7, k = a >> 4, s = R[a & 7], v = R[r], t = (PC + a) & 255, u = a > 254 ? R[7] : a;
  Y = 0;
  PC = (PC + 1) & 255;
  if (o < 6) o == 2 ? (wr(u, v), (LR = r)) : o == 4 ? add(v, a ^ 255, 1) : set(r, !o ? a : o == 1 ? rd(u) : o == 3 ? add(v, a, 0) : v & a);
  else if (o == 6) k == 5 ? add(v, s ^ 255, 1) : set(r, !k ? s : k < 5 ? add(v, k > 2 ? s ^ 255 : s, k == 1 ? 0 : k == 3 || C) : k == 6 ? v & s : k == 7 ? v ^ s : v | s);
  else if (o == 7) set(r, a < 2 ? ((v << 1) | (a && C)) & 255 : (v >> 1) | (a > 2 && C << 7)), (C = a < 2 ? v >> 7 : v & 1);
  else if (o < 13) [1, Z, !Z, C, !C][o - 8] && (PC = t);
  else if (o == 13) set(r, add(v, 255, 0)), Z || (PC = t);
  else if (o == 14 || r == 2) (wr(S, o == 14 ? PC : s), S = (S - 1) & 255), o == 14 && (PC = t);
  else if (!r) Y = 1;
  else if (r == 1) PC = rd((S = (S + 1) & 255));
  else if (r == 3) R[a & 7] = rd((S = (S + 1) & 255));
  else if (r == 4) V.fill(0), (BA |= 8);
  else {
    BA |= 8;
    for (let y = 0; y < (r == 5 ? (a & 15) || 20 : 8); y++)
      for (let x = 0; x < (r == 5 ? k || 64 : 8); x++)
        plot(R[4] + x, R[5] + y, r == 5 ? a : pcg['0123456789+-×÷=.ABCDEF'[s % 22]].pat[y] & (128 >> x));
    if (r == 7) R[4] = (R[4] + 8) & 255;
  }
};

const press = (j) => ((kx = j & 3), (ky = j >> 2), (M[241] = 128 | +('0x' + '789d456c123bf0ea'[j])), (fl = 6));

load(0);

function tick() {
  let i, j, s, b, busy, col;
  for (i = 6; i--; ) if (btnp(i)) demo = 0;
  // boot auto-demo: 3 5 5 ÷ 1 1 3 =
  if (demo && T % 8 < 1 && T > 7 && T < 72) press(+('0x' + 'a55388ae'[T / 8 - 1]));

  if (btnp(5)) load(1 - ri), play(0, 'V9O4cfaC');
  if (ri) {
    M[240] = btn(2) * 4 + btn(3) * 8 + btn(4) * 16;
    if (btnp(0) && sp < 4) sp++;
    if (btnp(1) && sp) sp--;
  } else {
    if (btnp(0) && ky > 0) ky--, play(1, 'V5O5c');
    if (btnp(1) && ky < 3) ky++, play(1, 'V5O5c');
    if (btnp(2) && kx > 0) kx--, play(1, 'V5O5c');
    if (btnp(3) && kx < 3) kx++, play(1, 'V5O5c');
    if (btnp(4)) press(ky << 2 | kx), play(1, 'V8O5e');
  }

  // run the CPU for this 1/60 s
  BA = 0;
  s = [0, -4, 4, 68, 450][sp];
  b = s > 0 ? s : (!sp && btnp(4)) || (s && T % 4 < 1);
  while (b-- > 0) {
    step();
    if (Y && s > 1) break;
  }

  // piezo (MMIO $FC) + "thinking" chirp while BUSY
  if ((b = M[252])) play(0, 'V9O' + (2 + ((b / 12) | 0)) + '#'.repeat(b % 12) + 'c'), (M[252] = 0);
  else if (M[254] & 1 && T % 3 < 1) play(2, 'V4O6' + 'cegb'[PC & 3]);

  cls(0);
  busy = M[254];
  put(0, 0, ' PL-8 ' + (ri ? 'BRICK' : 'CALC ') + ' ' + SPN[sp].padStart(5) + ' ', 6, 1);
  put(19, 0, busy & 1 ? '●' : '○', busy & 1 ? 3 : 5, 1);
  // decoder: PC, flags
  put(0, 1, 'PC ' + hx(PC) + ' Z' + +Z + ' C' + +C, 6);
  // ALU: operand A, operand B, ripple carry chain + RAM / STACK / BUS monitors
  put(0, 3, 'ALU ADDER', BA & 2 ? 6 : 2);
  for (i = 3; i--; ) {
    put(0, 4 + i, 'ABC'[i] + ' ' + ([A, B, CY][i] | 256).toString(2).slice(1).replaceAll('0', '·'), [7, 4, 3][i]);
    put(0, 13 + i, ['MEM', 'STK', 'BUS'][i] + ' ' + '■'.repeat(i ? i > 1 ? (BA & 5 ? 6 : 1) : Math.max(0, 239 - S) : 4).padEnd(6, '·'), [3, 5, 6][i]);
  }
  // 256-byte RAM die as braille, 1 dot = 1 byte, the cell on the bus lights up
  put(0, 12, 'RAM' + (BA & 5 ? '━━' : '──') + 'SP:' + hx(S), BA & 5 ? 6 : 2);
  // 6-digit 7-segment display (MMIO $F2-$F7) drawn from built-in box glyphs, unlit segments dim
  col = busy & 2 ? 3 : 6;
  for (i = 6; i--; ) {
    const v = M[242 + i];
    for (j = 7; j--; ) spr(i * 8 + 104 + [0, 2, 2, 0, -2, -2, 0][j], [4, 8, 16, 17, 16, 8, 11][j], j % 3 ? '│' : '▬', (SEG[v & 15] >> j) & 1 ? col : 1);
    if (v & 128) spr(i * 8 + 109, 16, '.', 7);
  }
  // LCD PCG tiles + RAM / STACK / BUS monitors
  for (i = 32; i--; ) {
    const p = [];
    for (j = 8; j--; ) p[j] = V[((i >> 3) * 8 + j) * 8 + (i & 7)];
    pcg[String.fromCharCode(57344 + i)].pat = p;
    put(12 + (i & 7), 3 + (i >> 3), String.fromCharCode(57344 + i), 0, 5);
  }
  // 4x4 keypad (in BRICK: ⬅ Ⓐ ➡ light up on 4 5 6)
  for (i = 16; i--; ) {
    i && put(11, i, '│', 1);
    i < 8 && put((i % 2) * 6, 8 + (i >> 1), 'R' + i + ':' + hx(R[i]), LR == i ? 6 : R[i] ? 7 : 2, LR == i ? 1 : 0);
    const sel = !ri && (ky << 2 | kx) == i, hot = (sel && fl) || (ri && i > 3 && i < 7 && btn([2, 4, 3][i - 4]));
    b = hot ? 3 : sel ? 7 : 1;
    put((i & 3) * 2 + 12, (i >> 2) * 2 + 8, KL[i] + ' ', b < 2 ? (i & 3) > 2 ? 6 : 7 : 0, b);
    put((i & 3) * 2 + 12, (i >> 2) * 2 + 9, '▄▄', 0, b);
  }
  if (fl) fl--;
  put(9, 16, 'haruka_apps', 2);
  put(0, 17, (ri ? '⬅➡PAD ⒶACT ⬆⬇Hz ' : '⬆⬇⬅➡KEY  ⒶPUSH  ') + 'ⒷROM', 7, 1);
  T++;
}

