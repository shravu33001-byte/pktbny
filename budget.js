const express = require("express");
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { syncBunnies } = require("../bunnyLogic");

const router = express.Router();

const CATEGORIES = [
  "food", "transportation", "entertainment",
  "shopping", "health", "education", "utilities", "other"
];

function getOrCreateBudget(userId) {
  let budget = db.prepare("SELECT * FROM budgets WHERE user_id = ?").get(userId);
  if (!budget) {
    db.prepare("INSERT OR IGNORE INTO budgets (user_id) VALUES (?)").run(userId);
    budget = db.prepare("SELECT * FROM budgets WHERE user_id = ?").get(userId);
  }
  return budget;
}

function isNonNegative(v) {
  return v !== "" && v !== null && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1e12;
}

// ─── GET BUDGET ───────────────────────────────────────────────────────────────
router.get("/", authenticateToken, (req, res) => {
  res.json({ budget: formatBudget(getOrCreateBudget(req.user.id)) });
});

// ─── SET TOTAL BUDGET ────────────────────────────────────────────────────────
router.put("/total", authenticateToken, (req, res) => {
  const { totalBudget } = req.body;

  if (totalBudget == null || !isNonNegative(totalBudget)) {
    return res.status(400).json({ error: "totalBudget must be a non-negative number" });
  }

  getOrCreateBudget(req.user.id);
  db.prepare("UPDATE budgets SET total_budget = ? WHERE user_id = ?").run(Number(totalBudget), req.user.id);
  syncBunnies(req.user.id);

  res.json({ message: "Total budget updated", budget: formatBudget(getOrCreateBudget(req.user.id)) });
});

// ─── SET CATEGORY BUDGETS ────────────────────────────────────────────────────
// Body can include any subset of the 8 categories + optional totalBudget
router.put("/categories", authenticateToken, (req, res) => {
  const allowed = ["totalBudget", ...CATEGORIES];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] != null) {
      if (!isNonNegative(req.body[key])) {
        return res.status(400).json({ error: `${key} must be a non-negative number` });
      }
      updates[key] = Number(req.body[key]);
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid budget fields provided" });
  }

  const fieldMap = {
    totalBudget:    "total_budget",
    food:           "food",
    transportation: "transportation",
    entertainment:  "entertainment",
    shopping:       "shopping",
    health:         "health",
    education:      "education",
    utilities:      "utilities",
    other:          "other"
  };

  const setClauses = Object.keys(updates).map(k => `${fieldMap[k]} = ?`).join(", ");
  const values     = Object.values(updates);

  getOrCreateBudget(req.user.id);
  db.prepare(`UPDATE budgets SET ${setClauses} WHERE user_id = ?`).run(...values, req.user.id);
  syncBunnies(req.user.id);

  res.json({ message: "Budget updated", budget: formatBudget(getOrCreateBudget(req.user.id)) });
});

function formatBudget(row) {
  return {
    totalBudget:    row.total_budget,
    food:           row.food,
    transportation: row.transportation,
    entertainment:  row.entertainment,
    shopping:       row.shopping,
    health:         row.health,
    education:      row.education,
    utilities:      row.utilities,
    other:          row.other
  };
}

module.exports = router;
