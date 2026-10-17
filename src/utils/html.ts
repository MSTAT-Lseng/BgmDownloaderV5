/**
 * 极简 HTML 实体解码工具。
 *
 * Bangumi 接口返回的标题 / 简介里可能带 `&amp;`、`&quot;`、`&#x2605;`
 * 这类 HTML 实体，直接渲染会原样显示。React Native 没有 DOM，
 * 无法用 textarea / DOMParser 的 hack，所以这里用一个小的映射表处理。
 *
 * 只解码一次：`&amp;amp;` 会变成 `&amp;`（与浏览器一次解析的结果一致），
 * 避免把本该显示的 `&lt;` 等文本过度解码。
 */

/** 常见命名实体 → 字符（小写键名） */
const NAMED_ENTITIES: Record<string, string> = {
  // 基础转义
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",

  // 标点与排版
  hellip: "…",
  mdash: "—",
  ndash: "–",
  minus: "−",
  middot: "·",
  bull: "•",
  laquo: "«",
  raquo: "»",
  lsaquo: "‹",
  rsaquo: "›",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  bdquo: "„",
  dagger: "†",
  Dagger: "‡",
  permil: "‰",
  prime: "′",
  Prime: "″",
  sect: "§",
  para: "¶",

  // 符号
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  divide: "÷",
  plusmn: "±",
  deg: "°",
  micro: "µ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sup1: "¹",
  sup2: "²",
  sup3: "³",
  infin: "∞",
  ne: "≠",
  le: "≤",
  ge: "≥",
  asymp: "≈",
  radic: "√",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",

  // 货币
  cent: "¢",
  pound: "£",
  yen: "¥",
  euro: "€",

  // 装饰（番剧名里偶尔出现）
  star: "☆",
  starf: "★",
  hearts: "♥",
  spades: "♠",
  clubs: "♣",
  diams: "♦",
  loz: "◊",
  half: "½",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwj: "\u200d",
  zwnj: "\u200c",
};

/** 匹配 `&name;` / `&#123;` / `&#x1F600;` */
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

function decodeNumeric(code: string): string | null {
  const isHex = code[1] === "x" || code[1] === "X";
  const digits = code.slice(isHex ? 2 : 1);
  const value = Number.parseInt(digits, isHex ? 16 : 10);

  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return null;
  // 单独的代理项无法组成合法字符，保持原样
  if (value >= 0xd800 && value <= 0xdfff) return null;

  try {
    return String.fromCodePoint(value);
  } catch {
    return null;
  }
}

/**
 * 解码字符串里的 HTML 实体；非字符串或空值返回空串。
 *
 * 未知实体原样保留，避免误删正文。
 */
export function decodeHtmlEntities(input?: string | null): string {
  if (typeof input !== "string" || input.length === 0) return "";
  if (input.indexOf("&") === -1) return input;

  return input.replace(ENTITY_RE, (match, code: string) => {
    if (code.startsWith("#")) {
      const decoded = decodeNumeric(code);
      return decoded ?? match;
    }
    // 命名实体大小写敏感（Ccedil / ccedil 等），先精确匹配再尝试小写
    const exact = NAMED_ENTITIES[code];
    if (exact !== undefined) return exact;

    const lower = NAMED_ENTITIES[code.toLowerCase()];
    return lower ?? match;
  });
}
