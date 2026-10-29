const Database = require("better-sqlite3");
const path = require("path");

// DB_PATH lets tests (or a deployment) point at a different file.
const db = new Database(process.env.DB_PATH || path.join(__dirname, "pocket_bunny.db"));

// WAL = better performance; foreign_keys makes "delete account" cascade to all of the user's data.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── USERS ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name  TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

// ─── EXPENSES ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    description TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    category    TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    notes       TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ─── BUDGETS ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE,
    total_budget   REAL    NOT NULL DEFAULT 0,
    food           REAL    NOT NULL DEFAULT 0,
    transportation REAL    NOT NULL DEFAULT 0,
    entertainment  REAL    NOT NULL DEFAULT 0,
    shopping       REAL    NOT NULL DEFAULT 0,
    health         REAL    NOT NULL DEFAULT 0,
    education      REAL    NOT NULL DEFAULT 0,
    utilities      REAL    NOT NULL DEFAULT 0,
    other          REAL    NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ─── BUNNIES ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS bunnies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    bunny_id    INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT,
    unlocked_at TEXT    DEFAULT (datetime('now')),
    UNIQUE(user_id, bunny_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Helpful indexes for the per-user / per-month queries used everywhere.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
`);

module.exports = db;
