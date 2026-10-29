const express = require("express");
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { syncBunnies } = require("../bunnyLogic");

const router = express.Router();

const VALID_CATEGORIES = [
  "food", "transportation", "entertainment",
  "shopping", "health", "education", "utilities", "other"
];

function validDate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === str;   // rejects e.g. 2026-02-31
}
function validAmount(v) {
  const n = Number(v);
  return v !== "" && v !== null && Number.isFinite(n) && n > 0 && n <= 1e10;
}
function validId(id) {
  return /^\d+$/.test(String(id));
}

// ─── GET ALL EXPENSES (optional ?month=YYYY-MM) ──────────────────────────────
router.get("/", authenticateToken, (req, res) => {
  const { month } = req.query;
  let expenses;

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
    }
    expenses = db.prepare(
      "SELECT * FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC"
    ).all(req.user.id, month);
  } else {
    expenses = db.prepare(
      "SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC"
    ).all(req.user.id);
  }

  res.json({ expenses });
});

// ─── GET SINGLE EXPENSE ──────────────────────────────────────────────────────
router.get("/:id", authenticateToken, (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: "Expense not found" });
  const expense = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!expense) return res.status(404).json({ error: "Expense not found" });
  res.json({ expense });
});

// ─── ADD EXPENSE ─────────────────────────────────────────────────────────────
router.post("/", authenticateToken, (req, res) => {
  const description = String(req.body.description || "").trim();
  const { amount, date } = req.body;
  const category = String(req.body.category || "").toLowerCase();
  const notes = req.body.notes ? String(req.body.notes).trim() : null;

  if (!description || amount === undefined || !category || !date) {
    return res.status(400).json({ error: "description, amount, category, and date are required" });
  }
  if (description.length > 200) {
    return res.status(400).json({ error: "description must be 200 characters or fewer" });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
  }
  if (!validAmount(amount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!validDate(date)) {
    return res.status(400).json({ error: "date must be a real date in YYYY-MM-DD format" });
  }

  const result = db.prepare(
    "INSERT INTO expenses (user_id, description, amount, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.user.id, description, Number(amount), category, date, notes || null);

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(result.lastInsertRowid);
  syncBunnies(req.user.id);

  res.status(201).json({ message: "Expense added", expense });
});

// ─── UPDATE EXPENSE ──────────────────────────────────────────────────────────
router.put("/:id", authenticateToken, (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: "Expense not found" });
  const existing = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!existing) return res.status(404).json({ error: "Expense not found" });

  const { description, amount, category, date, notes } = req.body;

  const updatedDescription = description !== undefined ? String(description).trim() : existing.description;
  const updatedAmount      = amount      !== undefined ? amount : existing.amount;
  const updatedCategory    = category    ? String(category).toLowerCase() : existing.category;
  const updatedDate        = date        !== undefined ? date : existing.date;
  const updatedNotes       = notes       !== undefined ? (String(notes).trim() || null) : existing.notes;

  if (!updatedDescription || updatedDescription.length > 200) {
    return res.status(400).json({ error: "description is required (max 200 characters)" });
  }
  if (!VALID_CATEGORIES.includes(updatedCategory)) {
    return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
  }
  if (!validAmount(updatedAmount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!validDate(updatedDate)) {
    return res.status(400).json({ error: "date must be a real date in YYYY-MM-DD format" });
  }

  db.prepare(
    `UPDATE expenses
     SET description = ?, amount = ?, category = ?, date = ?, notes = ?
     WHERE id = ? AND user_id = ?`
  ).run(updatedDescription, Number(updatedAmount), updatedCategory, updatedDate, updatedNotes, req.params.id, req.user.id);

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  syncBunnies(req.user.id);
  res.json({ message: "Expense updated", expense: updated });
});

// ─── DELETE EXPENSE ──────────────────────────────────────────────────────────
router.delete("/:id", authenticateToken, (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: "Expense not found" });
  const existing = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!existing) return res.status(404).json({ error: "Expense not found" });

  db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  syncBunnies(req.user.id);
  res.json({ message: "Expense deleted" });
});

module.exports = router;
