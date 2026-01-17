import * as SQLite from "expo-sqlite";

export type FavoriteItem = { name: string; url: string };

export type ListOptions = {
  limit?: number;
  offset?: number;
  keyword?: string;
  orderBy?: "name" | "url";
  order?: "ASC" | "DESC";
};

const DB_NAME = "app.db";
const TABLE = "favorites";

function assertNonEmpty(v: string, field: string) {
  if (!v || !v.trim()) throw new Error(`${field}不能为空`);
}
function norm(s: string) {
  return s.trim();
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    // Expo 54 + expo-sqlite 16: openDatabaseAsync 是标准用法
    // 若你后续用到 FTS/扩展并遇到关闭连接相关问题，可考虑加 options（见下方备注）
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export class FavoritesDB {
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

  static async removeByUrl(url: string) {
    const db = await getDb();
    const u = norm(url);
    assertNonEmpty(u, "url");
    await db.runAsync(`DELETE FROM ${TABLE} WHERE url = ?;`, [u]);
  }

  static async clear() {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE};`);
  }

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
