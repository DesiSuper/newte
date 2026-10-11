/**
 * Client-side PDF decryption (PDF "Standard" security handler).
 * Supports: RC4 40-bit, RC4 128-bit, AES-128 (V4/R4), AES-256 (V5/R5 + R6).
 * Works with the user password or the owner password (an empty user password
 * opens "owner-restricted only" files automatically).
 *
 * Returns a clean, unencrypted PDF (classic xref, no object streams) that can
 * be handed to pdf-lib afterwards. Returns null if the file is not encrypted.
 * Throws Error('Incorrect password...') if the password is not accepted.
 */

/* ------------------------------------------------------------------ */
/* small crypto primitives                                             */
/* ------------------------------------------------------------------ */

const PAD = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function concat(...parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function eq(a: Uint8Array, b: Uint8Array, len = Math.max(a.length, b.length)): boolean {
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---- MD5 ----
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;

export function md5(data: Uint8Array): Uint8Array {
  const len = data.length;
  const total = (((len + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(total);
  buf.set(data);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, (len << 3) >>> 0, true);
  dv.setUint32(total - 4, Math.floor(len / 536870912) >>> 0, true);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) & 15;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) & 15;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) & 15;
      }
      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << MD5_S[i]) | (F >>> (32 - MD5_S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const od = new DataView(out.buffer);
  od.setUint32(0, a0, true);
  od.setUint32(4, b0, true);
  od.setUint32(8, c0, true);
  od.setUint32(12, d0, true);
  return out;
}

// ---- RC4 ----
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
    out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

// ---- WebCrypto helpers ----
const subtle = (): SubtleCrypto => {
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c || !c.subtle) throw new Error('Secure crypto is not available in this browser (HTTPS required).');
  return c.subtle;
};

async function sha(alg: 'SHA-256' | 'SHA-384' | 'SHA-512', data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest(alg, data));
}

/** AES-CBC decrypt WITHOUT padding handling (length must be a multiple of 16). */
async function aesCbcDecryptRaw(keyBytes: Uint8Array, iv: Uint8Array, ct: Uint8Array): Promise<Uint8Array> {
  if (ct.length === 0) return new Uint8Array(0);
  const key = await subtle().importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt', 'decrypt']);
  const last = ct.slice(ct.length - 16);
  // build a valid trailing padding block so WebCrypto's PKCS#7 check passes
  const padEnc = new Uint8Array(
    await subtle().encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16))
  ).slice(0, 16);
  const full = concat(ct, padEnc);
  return new Uint8Array(await subtle().decrypt({ name: 'AES-CBC', iv }, key, full));
}

/** AES-CBC encrypt WITHOUT padding (length multiple of 16). */
async function aesCbcEncryptRaw(keyBytes: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await subtle().importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt']);
  const out = new Uint8Array(await subtle().encrypt({ name: 'AES-CBC', iv }, key, data));
  return out.slice(0, data.length);
}

/** AES-CBC decrypt a PDF stream/string: first 16 bytes are the IV, PKCS#7 padding. */
async function aesDecryptPdfData(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (data.length < 32) return new Uint8Array(0);
  const iv = data.slice(0, 16);
  let body = data.slice(16);
  if (body.length % 16 !== 0) body = body.slice(0, body.length - (body.length % 16));
  const plain = await aesCbcDecryptRaw(key, iv, body);
  // plain still contains PKCS#7 padding? (raw helper strips only our extra block)
  if (plain.length === 0) return plain;
  const padLen = plain[plain.length - 1];
  if (padLen >= 1 && padLen <= 16 && padLen <= plain.length) return plain.slice(0, plain.length - padLen);
  return plain;
}

/** Algorithm 2.B (ISO 32000-2) hash for R6 */
async function hashR6(password: Uint8Array, salt: Uint8Array, udata: Uint8Array): Promise<Uint8Array> {
  let K = await sha('SHA-256', concat(password, salt, udata));
  let i = 0;
  for (;;) {
    const unit = concat(password, K, udata);
    const K1 = new Uint8Array(unit.length * 64);
    for (let r = 0; r < 64; r++) K1.set(unit, r * unit.length);
    const E = await aesCbcEncryptRaw(K.slice(0, 16), K.slice(16, 32), K1);
    let mod = 0;
    for (let b = 0; b < 16; b++) mod += E[b];
    mod %= 3;
    K = await sha(mod === 0 ? 'SHA-256' : mod === 1 ? 'SHA-384' : 'SHA-512', E);
    i++;
    if (i >= 64 && E[E.length - 1] <= i - 32) break;
  }
  return K.slice(0, 32);
}

async function hashR5(password: Uint8Array, salt: Uint8Array, udata: Uint8Array): Promise<Uint8Array> {
  return sha('SHA-256', concat(password, salt, udata));
}

/* ------------------------------------------------------------------ */
/* tiny PDF object parser / writer                                     */
/* ------------------------------------------------------------------ */

type Node =
  | { k: 'dict'; m: Map<string, Node> }
  | { k: 'arr'; a: Node[] }
  | { k: 'name'; s: string }
  | { k: 'num'; raw: string }
  | { k: 'str'; b: Uint8Array }
  | { k: 'ref'; n: number; g: number }
  | { k: 'lit'; s: string }; // true / false / null

const isWs = (c: number) => c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32;
const isDelim = (c: number) =>
  c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;
const isDigit = (c: number) => c >= 0x30 && c <= 0x39;

class Lexer {
  p: number;
  constructor(public b: Uint8Array, p = 0) {
    this.p = p;
  }

  skipWs() {
    for (;;) {
      const c = this.b[this.p];
      if (c === undefined) return;
      if (isWs(c)) this.p++;
      else if (c === 0x25) {
        while (this.p < this.b.length && this.b[this.p] !== 10 && this.b[this.p] !== 13) this.p++;
      } else return;
    }
  }

  readRegular(): string {
    let s = '';
    while (this.p < this.b.length) {
      const c = this.b[this.p];
      if (isWs(c) || isDelim(c)) break;
      s += String.fromCharCode(c);
      this.p++;
    }
    return s;
  }

  matchWord(w: string): boolean {
    for (let i = 0; i < w.length; i++) if (this.b[this.p + i] !== w.charCodeAt(i)) return false;
    const after = this.b[this.p + w.length];
    return after === undefined || isWs(after) || isDelim(after);
  }

  parse(): Node {
    this.skipWs();
    const c = this.b[this.p];
    if (c === undefined) throw new Error('Unexpected end of PDF data');

    if (c === 0x3c) {
      if (this.b[this.p + 1] === 0x3c) {
        this.p += 2;
        const m = new Map<string, Node>();
        for (;;) {
          this.skipWs();
          if (this.b[this.p] === 0x3e && this.b[this.p + 1] === 0x3e) {
            this.p += 2;
            break;
          }
          if (this.p >= this.b.length) throw new Error('Unterminated dictionary');
          const key = this.parse();
          if (key.k !== 'name') throw new Error('Bad dictionary key');
          this.skipWs();
          if (this.b[this.p] === 0x3e && this.b[this.p + 1] === 0x3e) {
            m.set(key.s, { k: 'lit', s: 'null' });
            this.p += 2;
            break;
          }
          m.set(key.s, this.parse());
        }
        return { k: 'dict', m };
      }
      // hex string
      this.p++;
      const out: number[] = [];
      let hi = -1;
      while (this.p < this.b.length && this.b[this.p] !== 0x3e) {
        const ch = this.b[this.p++];
        let v = -1;
        if (ch >= 0x30 && ch <= 0x39) v = ch - 0x30;
        else if (ch >= 0x41 && ch <= 0x46) v = ch - 0x41 + 10;
        else if (ch >= 0x61 && ch <= 0x66) v = ch - 0x61 + 10;
        if (v < 0) continue;
        if (hi < 0) hi = v;
        else {
          out.push((hi << 4) | v);
          hi = -1;
        }
      }
      if (hi >= 0) out.push(hi << 4);
      this.p++;
      return { k: 'str', b: new Uint8Array(out) };
    }

    if (c === 0x28) {
      this.p++;
      let depth = 1;
      const out: number[] = [];
      while (this.p < this.b.length) {
        const ch = this.b[this.p++];
        if (ch === 0x5c) {
          const e = this.b[this.p++];
          if (e === 0x6e) out.push(10);
          else if (e === 0x72) out.push(13);
          else if (e === 0x74) out.push(9);
          else if (e === 0x62) out.push(8);
          else if (e === 0x66) out.push(12);
          else if (e >= 0x30 && e <= 0x37) {
            let v = e - 0x30;
            for (let k = 0; k < 2; k++) {
              const d = this.b[this.p];
              if (d >= 0x30 && d <= 0x37) {
                v = v * 8 + (d - 0x30);
                this.p++;
              } else break;
            }
            out.push(v & 255);
          } else if (e === 13) {
            if (this.b[this.p] === 10) this.p++;
          } else if (e === 10) {
            // line continuation
          } else out.push(e);
        } else if (ch === 0x28) {
          depth++;
          out.push(ch);
        } else if (ch === 0x29) {
          depth--;
          if (depth === 0) break;
          out.push(ch);
        } else out.push(ch);
      }
      return { k: 'str', b: new Uint8Array(out) };
    }

    if (c === 0x5b) {
      this.p++;
      const a: Node[] = [];
      for (;;) {
        this.skipWs();
        if (this.b[this.p] === 0x5d) {
          this.p++;
          break;
        }
        if (this.p >= this.b.length) throw new Error('Unterminated array');
        a.push(this.parse());
      }
      return { k: 'arr', a };
    }

    if (c === 0x2f) {
      this.p++;
      let s = '';
      while (this.p < this.b.length) {
        const ch = this.b[this.p];
        if (isWs(ch) || isDelim(ch)) break;
        if (ch === 0x23) {
          const h = String.fromCharCode(this.b[this.p + 1] || 0, this.b[this.p + 2] || 0);
          if (/^[0-9a-fA-F]{2}$/.test(h)) {
            s += String.fromCharCode(parseInt(h, 16));
            this.p += 3;
            continue;
          }
        }
        s += String.fromCharCode(ch);
        this.p++;
      }
      return { k: 'name', s };
    }

    if (isDigit(c) || c === 0x2b || c === 0x2d || c === 0x2e) {
      const raw = this.readRegular();
      if (/^\d+$/.test(raw)) {
        const save = this.p;
        this.skipWs();
        if (isDigit(this.b[this.p])) {
          const g = this.readRegular();
          if (/^\d+$/.test(g)) {
            this.skipWs();
            if (this.b[this.p] === 0x52) {
              const after = this.b[this.p + 1];
              if (after === undefined || isWs(after) || isDelim(after)) {
                this.p++;
                return { k: 'ref', n: parseInt(raw, 10), g: parseInt(g, 10) };
              }
            }
          }
        }
        this.p = save;
      }
      return { k: 'num', raw };
    }

    const word = this.readRegular();
    if (word === 'true' || word === 'false' || word === 'null') return { k: 'lit', s: word };
    throw new Error('Unexpected token in PDF: ' + word);
  }
}

const enc = new TextEncoder();

function hex(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16).toUpperCase();
  return s;
}

function serName(s: string): string {
  let out = '/';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x21 || c > 0x7e || c === 0x23 || isDelim(c)) out += '#' + (c < 16 ? '0' : '') + (c & 255).toString(16).toUpperCase();
    else out += s[i];
  }
  return out;
}

function ser(n: Node): string {
  switch (n.k) {
    case 'dict': {
      let s = '<<';
      n.m.forEach((v, k) => {
        s += serName(k) + ' ' + ser(v) + ' ';
      });
      return s + '>>';
    }
    case 'arr':
      return '[' + n.a.map(ser).join(' ') + ']';
    case 'name':
      return serName(n.s);
    case 'num':
      return n.raw;
    case 'str':
      return '<' + hex(n.b) + '>';
    case 'ref':
      return `${n.n} ${n.g} R`;
    case 'lit':
      return n.s;
  }
}

/* ------------------------------------------------------------------ */
/* object scanning                                                     */
/* ------------------------------------------------------------------ */

interface RawObj {
  gen: number;
  node: Node;
  stream?: Uint8Array;
}

function indexOfBytes(hay: Uint8Array, needle: string, from = 0): number {
  const n = needle.length;
  const first = needle.charCodeAt(0);
  outer: for (let i = from; i <= hay.length - n; i++) {
    if (hay[i] !== first) continue;
    for (let j = 1; j < n; j++) if (hay[i + j] !== needle.charCodeAt(j)) continue outer;
    return i;
  }
  return -1;
}

function scanObjects(b: Uint8Array): { objects: Map<number, RawObj>; trailers: Map<string, Node>[] } {
  const objects = new Map<number, RawObj>();
  const trailers: Map<string, Node>[] = [];
  const lx = new Lexer(b, 0);

  while (lx.p < b.length) {
    lx.skipWs();
    if (lx.p >= b.length) break;
    const start = lx.p;
    const c = b[lx.p];

    if (isDigit(c)) {
      const num = lx.readRegular();
      lx.skipWs();
      const gen = lx.readRegular();
      lx.skipWs();
      if (/^\d+$/.test(num) && /^\d+$/.test(gen) && lx.matchWord('obj')) {
        lx.p += 3;
        let node: Node;
        try {
          node = lx.parse();
        } catch {
          // damaged object: resync after the next "endobj"
          const e = indexOfBytes(b, 'endobj', lx.p);
          lx.p = e < 0 ? b.length : e + 6;
          continue;
        }
        const obj: RawObj = { gen: parseInt(gen, 10), node };
        lx.skipWs();
        if (lx.matchWord('stream') && node.k === 'dict') {
          let ds = lx.p + 6;
          if (b[ds] === 13 && b[ds + 1] === 10) ds += 2;
          else if (b[ds] === 10 || b[ds] === 13) ds += 1;
          let end = -1;
          const L = node.m.get('Length');
          if (L && L.k === 'num') {
            const len = parseInt(L.raw, 10);
            if (len >= 0 && ds + len <= b.length) {
              const t = new Lexer(b, ds + len);
              t.skipWs();
              if (t.matchWord('endstream')) end = ds + len;
            }
          }
          let after: number;
          if (end < 0) {
            const es = indexOfBytes(b, 'endstream', ds);
            if (es < 0) {
              end = b.length;
              after = b.length;
            } else {
              end = es;
              if (end > ds && b[end - 1] === 10) end--;
              if (end > ds && b[end - 1] === 13) end--;
              after = es + 9;
            }
          } else {
            const es = indexOfBytes(b, 'endstream', end);
            after = es < 0 ? end : es + 9;
          }
          obj.stream = b.slice(ds, end);
          lx.p = after;
        }
        objects.set(parseInt(num, 10), obj);
        // consume endobj
        lx.skipWs();
        if (lx.matchWord('endobj')) lx.p += 6;
        continue;
      }
      // not an object header: skip to the next line
      lx.p = start;
    } else if (c === 0x74 /* t */ && lx.matchWord('trailer')) {
      lx.p += 7;
      try {
        const t = lx.parse();
        if (t.k === 'dict') trailers.push(t.m);
      } catch {
        /* ignore */
      }
      continue;
    }

    // skip the current line
    while (lx.p < b.length && b[lx.p] !== 10 && b[lx.p] !== 13) lx.p++;
    if (lx.p === start) lx.p++;
  }
  return { objects, trailers };
}

/* ------------------------------------------------------------------ */
/* security handler                                                    */
/* ------------------------------------------------------------------ */

type Method = 'none' | 'rc4' | 'aes128' | 'aes256';

interface Handler {
  strMethod: Method;
  stmMethod: Method;
  objKey(n: number, g: number, method: Method): Uint8Array;
  encryptMetadata: boolean;
}

function num(n: Node | undefined, def: number): number {
  if (!n || n.k !== 'num') return def;
  const v = parseFloat(n.raw);
  return isNaN(v) ? def : v;
}
function bytesOf(n: Node | undefined): Uint8Array {
  return n && n.k === 'str' ? n.b : new Uint8Array(0);
}
function nameOf(n: Node | undefined): string {
  return n && n.k === 'name' ? n.s : '';
}

function padPassword(pw: Uint8Array): Uint8Array {
  const p = pw.slice(0, 32);
  return concat(p, PAD.slice(0, 32 - p.length));
}

function latin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}

async function buildHandler(E: Map<string, Node>, id0: Uint8Array, password: string): Promise<Handler> {
  const filter = nameOf(E.get('Filter'));
  if (filter && filter !== 'Standard') throw new Error('Unsupported PDF encryption handler: ' + filter);

  const V = num(E.get('V'), 0);
  const R = num(E.get('R'), 2);
  const O = bytesOf(E.get('O'));
  const U = bytesOf(E.get('U'));
  const P = num(E.get('P'), 0);
  const encMetaNode = E.get('EncryptMetadata');
  const encryptMetadata = !(encMetaNode && encMetaNode.k === 'lit' && encMetaNode.s === 'false');

  // ---- crypt filter methods ----
  let strMethod: Method = 'rc4';
  let stmMethod: Method = 'rc4';
  if (V >= 4) {
    const cf = E.get('CF');
    const resolve = (nm: string): Method => {
      if (!nm || nm === 'Identity') return 'none';
      const d = cf && cf.k === 'dict' ? cf.m.get(nm) : undefined;
      const cfm = d && d.k === 'dict' ? nameOf(d.m.get('CFM')) : '';
      if (cfm === 'V2') return 'rc4';
      if (cfm === 'AESV2') return 'aes128';
      if (cfm === 'AESV3') return 'aes256';
      return 'none';
    };
    stmMethod = resolve(nameOf(E.get('StmF')));
    strMethod = resolve(nameOf(E.get('StrF')));
  }

  const wrong = () =>
    new Error('Incorrect password. Please enter the correct password to unlock this PDF.');

  /* ---------- V5 : AES-256 (R5 / R6) ---------- */
  if (V >= 5) {
    const UE = bytesOf(E.get('UE'));
    const OE = bytesOf(E.get('OE'));
    let pw = enc.encode(password);
    if (pw.length > 127) pw = pw.slice(0, 127);
    const hash = R >= 6 ? hashR6 : hashR5;
    const empty = new Uint8Array(0);
    const U48 = U.slice(0, 48);

    let fileKey: Uint8Array | null = null;
    // user password?
    const uHash = await hash(pw, U.slice(32, 40), empty);
    if (eq(uHash, U, 32)) {
      const ik = await hash(pw, U.slice(40, 48), empty);
      fileKey = await aesCbcDecryptRaw(ik, new Uint8Array(16), UE.slice(0, 32));
    } else {
      const oHash = await hash(pw, O.slice(32, 40), U48);
      if (eq(oHash, O, 32)) {
        const ik = await hash(pw, O.slice(40, 48), U48);
        fileKey = await aesCbcDecryptRaw(ik, new Uint8Array(16), OE.slice(0, 32));
      }
    }
    if (!fileKey) throw wrong();
    const fk = fileKey;
    return {
      strMethod,
      stmMethod,
      encryptMetadata,
      objKey: () => fk,
    };
  }

  /* ---------- V1 - V4 : RC4 / AES-128 ---------- */
  const keyLen = V === 1 ? 5 : V >= 4 ? 16 : Math.max(5, Math.min(16, num(E.get('Length'), 40) / 8));
  const pBytes = new Uint8Array(4);
  new DataView(pBytes.buffer).setUint32(0, P >>> 0, true);

  const computeKey = (pwPadded: Uint8Array): Uint8Array => {
    let data = concat(pwPadded, O.slice(0, 32), pBytes, id0);
    if (R >= 4 && !encryptMetadata) data = concat(data, new Uint8Array([255, 255, 255, 255]));
    let h = md5(data);
    if (R >= 3) for (let i = 0; i < 50; i++) h = md5(h.slice(0, keyLen));
    return h.slice(0, keyLen);
  };

  const xorKey = (key: Uint8Array, v: number) => key.map((x) => x ^ v);

  const checkUser = (key: Uint8Array): boolean => {
    if (R === 2) return eq(rc4(key, PAD), U, 32);
    let x = rc4(key, md5(concat(PAD, id0)));
    for (let i = 1; i <= 19; i++) x = rc4(xorKey(key, i), x);
    return eq(x, U, 16);
  };

  const pwBytes = latin1(password);
  let fileKey = computeKey(padPassword(pwBytes));
  if (!checkUser(fileKey)) {
    // try as owner password
    let h = md5(padPassword(pwBytes));
    if (R >= 3) for (let i = 0; i < 50; i++) h = md5(h);
    const okey = h.slice(0, R === 2 ? 5 : keyLen);
    let userPw: Uint8Array;
    if (R === 2) userPw = rc4(okey, O.slice(0, 32));
    else {
      userPw = O.slice(0, 32);
      for (let i = 19; i >= 0; i--) userPw = rc4(xorKey(okey, i), userPw);
    }
    fileKey = computeKey(userPw);
    if (!checkUser(fileKey)) throw wrong();
  }
  const fk = fileKey;

  return {
    strMethod,
    stmMethod,
    encryptMetadata,
    objKey(n, g, method) {
      const ext = new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, g & 255, (g >> 8) & 255]);
      let base = concat(fk, ext);
      if (method === 'aes128') base = concat(base, new Uint8Array([0x73, 0x41, 0x6c, 0x54]));
      return md5(base).slice(0, Math.min(fk.length + 5, 16));
    },
  };
}

async function decryptBytes(h: Handler, method: Method, n: number, g: number, data: Uint8Array): Promise<Uint8Array> {
  if (method === 'none') return data;
  const key = h.objKey(n, g, method);
  if (method === 'rc4') return rc4(key, data);
  return aesDecryptPdfData(key, data);
}

async function decryptNode(h: Handler, node: Node, n: number, g: number): Promise<Node> {
  switch (node.k) {
    case 'str':
      return { k: 'str', b: await decryptBytes(h, h.strMethod, n, g, node.b) };
    case 'arr': {
      const a: Node[] = [];
      for (const x of node.a) a.push(await decryptNode(h, x, n, g));
      return { k: 'arr', a };
    }
    case 'dict': {
      const m = new Map<string, Node>();
      for (const [k, v] of node.m) m.set(k, await decryptNode(h, v, n, g));
      return { k: 'dict', m };
    }
    default:
      return node;
  }
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (!DS) throw new Error('This browser does not support DecompressionStream; please update your browser.');
  const stream = new Blob([data]).stream().pipeThrough(new DS('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function filtersOf(d: Map<string, Node>): string[] {
  const f = d.get('Filter');
  if (!f) return [];
  if (f.k === 'name') return [f.s];
  if (f.k === 'arr') return f.a.filter((x) => x.k === 'name').map((x) => (x as any).s);
  return [];
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export async function decryptPDF(input: Uint8Array, password = ''): Promise<Uint8Array | null> {
  if (indexOfBytes(input, '/Encrypt') < 0) return null;

  const { objects, trailers } = scanObjects(input);

  // merge trailer information (classic trailers and XRef-stream dictionaries)
  const tr = new Map<string, Node>();
  const take = (m: Map<string, Node>) => {
    for (const k of ['Root', 'Info', 'ID', 'Encrypt']) {
      const v = m.get(k);
      if (v) tr.set(k, v);
    }
  };
  trailers.forEach(take);
  for (const o of objects.values()) {
    if (o.node.k === 'dict' && nameOf(o.node.m.get('Type')) === 'XRef') take(o.node.m);
  }

  const encNode = tr.get('Encrypt');
  if (!encNode) return null;
  let encObjNum = -1;
  let E: Map<string, Node> | null = null;
  if (encNode.k === 'ref') {
    encObjNum = encNode.n;
    const o = objects.get(encNode.n);
    if (o && o.node.k === 'dict') E = o.node.m;
  } else if (encNode.k === 'dict') E = encNode.m;
  if (!E) throw new Error('Could not read the PDF encryption dictionary.');

  const idNode = tr.get('ID');
  const id0 = idNode && idNode.k === 'arr' && idNode.a[0] ? bytesOf(idNode.a[0]) : new Uint8Array(0);

  const handler = await buildHandler(E, id0, password);

  /* ---- decrypt every object, unpack object streams ---- */
  const out = new Map<number, { gen: number; node: Node; stream?: Uint8Array }>();

  for (const [n, o] of objects) {
    if (n === encObjNum) continue;
    const isDict = o.node.k === 'dict';
    const type = isDict ? nameOf((o.node as any).m.get('Type')) : '';
    if (type === 'XRef') continue;

    const node = await decryptNode(handler, o.node, n, o.gen);

    if (o.stream && node.k === 'dict') {
      let data = o.stream;
      const filters = filtersOf(node.m);
      const skip =
        filters.includes('Crypt') || (type === 'Metadata' && !handler.encryptMetadata);
      if (!skip) data = await decryptBytes(handler, handler.stmMethod, n, o.gen, data);

      if (type === 'ObjStm') {
        let content = data;
        const fl = filtersOf(node.m);
        if (fl.length === 1 && (fl[0] === 'FlateDecode' || fl[0] === 'Fl')) content = await inflate(data);
        else if (fl.length > 0) continue; // exotic filter chain: cannot unpack
        const N = num(node.m.get('N'), 0);
        const first = num(node.m.get('First'), 0);
        const head = new Lexer(content, 0);
        const pairs: [number, number][] = [];
        for (let i = 0; i < N; i++) {
          head.skipWs();
          const a = head.readRegular();
          head.skipWs();
          const b = head.readRegular();
          pairs.push([parseInt(a, 10), parseInt(b, 10)]);
        }
        for (const [on, off] of pairs) {
          try {
            const inner = new Lexer(content, first + off).parse();
            out.set(on, { gen: 0, node: inner });
          } catch {
            /* skip unreadable inner object */
          }
        }
        continue;
      }
      out.set(n, { gen: o.gen, node, stream: data });
    } else {
      out.set(n, { gen: o.gen, node });
    }
  }

  /* ---- write a clean, unencrypted PDF ---- */
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (u: Uint8Array) => {
    chunks.push(u);
    offset += u.length;
  };
  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  let maxObj = 0;
  for (const k of out.keys()) if (k > maxObj) maxObj = k;
  const offsets = new Map<number, number>();

  const nums = Array.from(out.keys()).sort((a, b) => a - b);
  for (const n of nums) {
    const o = out.get(n)!;
    offsets.set(n, offset);
    let node = o.node;
    if (o.stream && node.k === 'dict') {
      const m = new Map(node.m);
      m.set('Length', { k: 'num', raw: String(o.stream.length) });
      node = { k: 'dict', m };
      push(enc.encode(`${n} ${o.gen} obj\n${ser(node)}\nstream\n`));
      push(o.stream);
      push(enc.encode('\nendstream\nendobj\n'));
    } else {
      push(enc.encode(`${n} ${o.gen} obj\n${ser(node)}\nendobj\n`));
    }
  }

  const size = maxObj + 1;
  const xrefPos = offset;
  let x = `xref\n0 ${size}\n`;
  for (let i = 0; i < size; i++) {
    const off = offsets.get(i);
    if (i === 0 || off === undefined) x += '0000000000 65535 f \n';
    else x += String(off).padStart(10, '0') + ' ' + String(out.get(i)!.gen).padStart(5, '0') + ' n \n';
  }
  let t = `trailer\n<< /Size ${size}`;
  const root = tr.get('Root');
  if (root) t += ' /Root ' + ser(root);
  const info = tr.get('Info');
  if (info && info.k === 'ref' && out.has(info.n)) t += ' /Info ' + ser(info);
  if (idNode) t += ' /ID ' + ser(idNode);
  t += ` >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  push(enc.encode(x + t));

  return concat(...chunks);
}
