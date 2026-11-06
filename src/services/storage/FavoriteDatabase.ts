/**
 * @file 收藏的本地存储（expo-sqlite）：建表、增删改查都在这里统一封装。
 */

import * as SQLite from "expo-sqlite";

/** 单条收藏 */
export type FavoriteItem = { name: string; url: string };

/** 列表查询参数 */
export type ListOptions = {
  limit?: number;
  offset?: number;
  keyword?: string;
  orderBy?: "name" | "url";
  order?: "ASC" | "DESC";
};

const DB_NAME = "app.db";
const TABLE = "favorites";

/** 校验必填字段，空白值直接抛错，避免脏数据落库 */
function assertNonEmpty(v: string, field: string) {
  if (!v || !v.trim()) throw new Error(`${field}不能为空`);
}
/** 统一去除首尾空白 */
function norm(s: string) {
  return s.trim();
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * 获取数据库连接，首次调用才真正打开，之后复用同一个 Promise。
 *
 * Expo 54 + expo-sqlite 16 的推荐写法就是 openDatabaseAsync；
 * 若后续用到 FTS 等扩展、并遇到关闭连接相关的问题，可在这里补 options。
 */
async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export class FavoritesDB {
  /** 建表并创建索引，可重复调用 */
  static async init() {
    const db = await getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS ${TABLE} (
        name TEXT NOT NULL,
        url  TEXT NOT NULL UNIQUE
      );

      CREATE INDEX IF NOT EXISTS idx_${TABLE}_name ON ${TABLE}(name);
    `);
  }

  /** 按 url 冲突时只更新名称 */
  static async upsert(item: FavoriteItem) {
    const db = await getDb();
    const name = norm(item.name);
    const url = norm(item.url);
    assertNonEmpty(name, "name");
    assertNonEmpty(url, "url");

    await db.runAsync(
      `
      INSERT INTO ${TABLE} (name, url)
      VALUES (?, ?)
      ON CONFLICT(url) DO UPDATE SET name=excluded.name;
      `,
      [name, url]
    );
  }

  /** 新增一条收藏；与已有 url 冲突时会抛错，需要覆盖请用 upsert */
  static async add(item: FavoriteItem) {
    const db = await getDb();
    const name = norm(item.name);
    const url = norm(item.url);
    assertNonEmpty(name, "name");
    assertNonEmpty(url, "url");

    await db.runAsync(`INSERT INTO ${TABLE} (name, url) VALUES (?, ?);`, [
      name,
      url,
    ]);
  }

  /** 判断该 url 是否已收藏 */
  static async exists(url: string) {
    const db = await getDb();
    const u = norm(url);
    assertNonEmpty(u, "url");

    const row = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(1) as cnt FROM ${TABLE} WHERE url = ?;`,
      [u]
    );
    return (row?.cnt ?? 0) > 0;
  }

  /** 按 url 查询单条收藏，不存在时返回 null */
  static async getByUrl(url: string) {
    const db = await getDb();
    const u = norm(url);
    assertNonEmpty(u, "url");

    const row = await db.getFirstAsync<FavoriteItem>(
      `SELECT name, url FROM ${TABLE} WHERE url = ?;`,
      [u]
    );
    return row ?? null;
  }

  /** 分页列出收藏；关键字会同时匹配名称和 url，排序字段做了白名单过滤 */
  static async list(opts: ListOptions = {}) {
    const db = await getDb();
    const {
      limit = 200,
      offset = 0,
      keyword,
      orderBy = "name",
      order = "ASC",
    } = opts;

    const safeOrderBy = orderBy === "url" ? "url" : "name";
    const safeOrder = order === "DESC" ? "DESC" : "ASC";

    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      return db.getAllAsync<FavoriteItem>(
        `
        SELECT name, url FROM ${TABLE}
        WHERE name LIKE ? OR url LIKE ?
        ORDER BY ${safeOrderBy} ${safeOrder}
        LIMIT ? OFFSET ?;
        `,
        [kw, kw, limit, offset]
      );
    }

    return db.getAllAsync<FavoriteItem>(
      `
      SELECT name, url FROM ${TABLE}
      ORDER BY ${safeOrderBy} ${safeOrder}
      LIMIT ? OFFSET ?;
      `,
      [limit, offset]
    );
  }

  /** 按 url 删除一条收藏 */
  static async removeByUrl(url: string) {
    const db = await getDb();
    const u = norm(url);
    assertNonEmpty(u, "url");
    await db.runAsync(`DELETE FROM ${TABLE} WHERE url = ?;`, [u]);
  }

  /** 清空全部收藏 */
  static async clear() {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE};`);
  }

  /** 按原 url 更新名称和/或 url；两项都没给时直接返回 */
  static async updateByUrl(url: string, patch: Partial<FavoriteItem>) {
    const db = await getDb();
    const u = norm(url);
    assertNonEmpty(u, "url");

    const nextName = patch.name != null ? norm(patch.name) : null;
    const nextUrl = patch.url != null ? norm(patch.url) : null;

    if (nextName != null) assertNonEmpty(nextName, "name");
    if (nextUrl != null) assertNonEmpty(nextUrl, "url");
    if (nextName == null && nextUrl == null) return;

    if (nextName != null && nextUrl != null) {
      await db.runAsync(`UPDATE ${TABLE} SET name=?, url=? WHERE url=?;`, [
        nextName,
        nextUrl,
        u,
      ]);
    } else if (nextName != null) {
      await db.runAsync(`UPDATE ${TABLE} SET name=? WHERE url=?;`, [
        nextName,
        u,
      ]);
    } else {
      await db.runAsync(`UPDATE ${TABLE} SET url=? WHERE url=?;`, [nextUrl, u]);
    }
  }
}
