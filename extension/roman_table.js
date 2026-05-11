const romanTable = {
  a: '\u3042',
  i: '\u3044',
  u: '\u3046',
  e: '\u3048',
  o: '\u304a',
  xa: '\u3041',
  xi: '\u3043',
  xu: '\u3045',
  xe: '\u3047',
  xo: '\u3049',
  ka: '\u304b',
  ki: '\u304d',
  ku: '\u304f',
  ke: '\u3051',
  ko: '\u3053',
  ga: '\u304c',
  gi: '\u304e',
  gu: '\u3050',
  ge: '\u3052',
  go: '\u3054',
  sa: '\u3055',
  si: '\u3057',
  su: '\u3059',
  se: '\u305b',
  so: '\u305d',
  za: '\u3056',
  zi: '\u3058',
  zu: '\u305a',
  ze: '\u305c',
  zo: '\u305e',
  ta: '\u305f',
  ti: '\u3061',
  tu: '\u3064',
  te: '\u3066',
  to: '\u3068',
  tsa: '\u3064\u3041',
  tsi: '\u3064\u3043',
  tsu: '\u3064',
  tse: '\u3064\u3047',
  tso: '\u3064\u3049',
  da: '\u3060',
  di: '\u3062',
  du: '\u3065',
  de: '\u3067',
  do: '\u3069',
  na: '\u306a',
  ni: '\u306b',
  nu: '\u306c',
  ne: '\u306d',
  no: '\u306e',
  ha: '\u306f',
  hi: '\u3072',
  hu: '\u3075',
  he: '\u3078',
  ho: '\u307b',
  ba: '\u3070',
  bi: '\u3073',
  bu: '\u3076',
  be: '\u3079',
  bo: '\u307c',
  pa: '\u3071',
  pi: '\u3074',
  pu: '\u3077',
  pe: '\u307a',
  po: '\u307d',
  ma: '\u307e',
  mi: '\u307f',
  mu: '\u3080',
  me: '\u3081',
  mo: '\u3082',
  ya: '\u3084',
  yi: '\u3044',
  yu: '\u3086',
  ye: '\u3044\u3047',
  yo: '\u3088',
  ra: '\u3089',
  ri: '\u308a',
  ru: '\u308b',
  re: '\u308c',
  ro: '\u308d',
  wa: '\u308f',
  wi: '\u3046\u3043',
  wu: '\u3046',
  we: '\u3046\u3047',
  wo: '\u3092',
  va: '\u3094\u3041',
  vi: '\u3094\u3043',
  vu: '\u3094',
  ve: '\u3094\u3047',
  vo: '\u3094\u3049',
  fa: '\u3075\u3041',
  fi: '\u3075\u3043',
  fu: '\u3075',
  fe: '\u3075\u3047',
  fo: '\u3075\u3049',

  xtu: '\u3063',
  nn: '\u3093',

  ',': '\u3001', // 、
  '.': '\u3002', // 。
  '[': '\uff62', // 「
  ']': '\uff63', // 」
  '-': '\u30fc', // ー
  '!': '\uff01', // ！
  '?': '\uff1f', // ？

  // The following rule comes from https://github.com/skk-dev/ddskk/blob/8c47f46e38a29a0f3eabcd524268d20573102467/docs/06_apps.rst?plain=1#L2100-L2137
  'z ': '\u3000', // 全角スペース
  z0: '\u25cb', // ○
  'z.': '\u2026', // …
  'z,': '\u2025', // ‥
  'z/': '\u30fb', // ・
  'z-': '\u301c', // 〜
  'z[': '\u300e', // 『
  'z]': '\u300f', // 』
  zh: '\u2190', // ←
  zj: '\u2193', // ↓
  zk: '\u2191', // ↑
  zl: '\u2192', // →

  // 1-9の丸数字
  z1: '\u2460', // ①
  z2: '\u2461', // ②
  z3: '\u2462', // ③
  z4: '\u2463', // ④
  z5: '\u2464', // ⑤
  z6: '\u2465', // ⑥
  z7: '\u2466', // ⑦
  z8: '\u2467', // ⑧
  z9: '\u2468', // ⑨
};

const katakanaTable = {};
const hankataTable = {};

const KANA_HALF_WIDTH_MAP = {
  0x3000: [0x0020], // スペース
  0x3001: [0xff64], // 、
  0x3002: [0xff61], // 。
  0x300c: [0xff62], // ｢
  0x300d: [0xff63], // ｣
  // ァ〜ロ
  0x30ee: [0xff9c], // ヮ
  0x30ef: [0xff9c], // ワ
  0x30f2: [0xff66], // ヲ
  0x30f3: [0xff9d], // ン
  0x30f4: [0xff73, 0xff9e], // ヴ
  0x30f5: [0xff76], // ヵ
  0x30f6: [0xff79], // ヶ
  0x30fb: [0xff61], // ・
  0x30fc: [0xff70], // ー
};
for (let c = 0x30a1; c <= 0x30ed; c++) {
  const map = KANA_HALF_WIDTH_MAP;
  switch (true) {
    case 0x30a1 <= c && c <= 0x30aa: {
      const isLarge = 1 - (c % 2); // ァ〜オ
      map[c] = [c + 0xcec6 - Math.floor((c - 0x30a1) / 2) + isLarge * 9.5];
      break;
    }
    case 0x30ab <= c && c <= 0x30c2: {
      const isDakuon = 1 - (c % 2); // カ〜ヂ
      map[c] = [
        c + 0xcecb - Math.floor((c - 0x30ab + isDakuon) / 2),
        ...(isDakuon ? [0xff9e] : []),
      ];
      break;
    }
    case 0x30c3 == c: // ッ
      map[c] = [0xff6f];
      break;
    case 0x30c4 <= c && c <= 0x30c9: {
      const isDakuon = c % 2; // ツ〜ド
      map[c] = [
        c + 0xcebe - Math.floor((c - 0x30c4 + isDakuon) / 2),
        ...(isDakuon ? [0xff9e] : []),
      ];
      break;
    }
    case 0x30ca <= c && c <= 0x30ce: // ナ〜ノ
      map[c] = [c + 0xcebb];
      break;
    case 0x30cf <= c && c <= 0x30dd: {
      const isDakuon = c % 3; // ハ〜ポ
      map[c] = [
        c + 0xcebb - 2 * Math.floor((c - 0x30cf) / 3) - isDakuon,
        ...(isDakuon ? [0xff9e] : []),
      ];
      break;
    }
    case 0x30de <= c && c <= 0x30e2: // マ〜モ
      map[c] = [c + 0xceb1];
      break;
    case 0x30e3 <= c && c <= 0x30e8: {
      const isLarge = 1 - (c % 2); // ャ〜ヨ
      map[c] = [c + 0xce89 - Math.floor((c - 0x30e3) / 2) + isLarge * 39.5];
      break;
    }
    case 0x30e9 <= c && c <= 0x30ed: // ラ〜ロ
      map[c] = [c + 0xceae];
  }
}

const kanaHalfWidth = (str) =>
  Array.from(str, (ch) => {
    const c = ch.charCodeAt(0);
    return String.fromCharCode(...(KANA_HALF_WIDTH_MAP[c] ?? [c]));
  }).join('');

(() => {
  const initRomanTable = () => {
    const youons = ['k', 's', 't', 'n', 'h', 'm', 'r', 'g', 'd', 'b', 'p', 'z'];
    // Add a mapping from "consonant + prefix + vowel" -> "consonant + i + small vowel"
    // Ex. tya -> ti + small a, shu -> si + small u
    const addYouon = (youon, prefix, base) => {
      const mapping = {
        a: '\u3083',
        i: '\u3043',
        u: '\u3085',
        e: '\u3047',
        o: '\u3087',
      };
      for (const sound in mapping) {
        const youon_char = mapping[sound];
        romanTable[youon + prefix + sound] = base + youon_char;
      }
    };
    for (const youon of youons) {
      addYouon(youon, 'y', romanTable[youon + 'i']);
    }

    addYouon('x', 'y', '');
    addYouon('t', 'h', romanTable['te']);
    addYouon('d', 'h', romanTable['de']);
    addYouon('s', 'h', romanTable['si']);
    addYouon('c', 'h', romanTable['ti']);
    addYouon('j', '', romanTable['zi']);

    // special case: shi==si, chi==ti, ji=zi
    romanTable['shi'] = romanTable['si'];
    romanTable['chi'] = romanTable['ti'];
    romanTable['ji'] = romanTable['zi'];

    for (const [key, hiragana] of Object.entries(romanTable)) {
      const katakana = Array.from(hiragana, (ch) => {
        const c = ch.charCodeAt(0);
        if (0x3040 < c && c < 0x3097) return String.fromCharCode(c + 0x60);
        return ch;
      }).join('');
      katakanaTable[key] = katakana;
      hankataTable[key] = kanaHalfWidth(katakana);
    }
  };

  initRomanTable();
})();
