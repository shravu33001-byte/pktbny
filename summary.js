const express = require("express");
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const CATEGORIES = [
  "food", "transportation", "entertainment",
  "shopping", "health", "education", "utilities", "other"
];

// ─── MONTHLY SUMMARY ─────────────────────────────────────────────────────────
// GET /summary?month=2024-08   (defaults to current month)
router.get("/", authenticateToken, (req, res) => {
  const month = req.query.month || getCurrentMonth();

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "month must be in YYYY-MM format" });
  }

  // Total spent this month
  const totalRow = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?"
  ).get(req.user.id, month);

  // Spending per category this month
  const categoryRows = db.prepare(
    `SELECT category, COALESCE(SUM(amount), 0) as spent
     FROM expenses
     WHERE user_id = ? AND strftime('%Y-%m', date) = ?
     GROUP BY category`
  ).all(req.user.id, month);

  // Build category map
  const categorySpending = {};
  for (const cat of CATEGORIES) categorySpending[cat] = 0;
  for (const row of categoryRows) categorySpending[row.category] = row.spent;

  // Budget for this user
  let budget = db.prepare("SELECT * FROM budgets WHERE user_id = ?").get(req.user.id);
  if (!budget) {
    db.prepare("INSERT OR IGNORE INTO budgets (user_id) VALUES (?)").run(req.user.id);
    budget = db.prepare("SELECT * FROM budgets WHERE user_id = ?").get(req.user.id);
  }

  const totalBudget  = budget.total_budget;
  const totalSpent   = totalRow.total;
  const remaining    = totalBudget - totalSpent;

  // Category breakdown with budget vs spent
  const breakdown = CATEGORIES.map(cat => ({
    category:   cat,
    budget:     budget[cat],
    spent:      categorySpending[cat],
    remaining:  budget[cat] - categorySpending[cat],
    percentage: budget[cat] > 0 ? Math.min(Math.round((categorySpending[cat] / budget[cat]) * 100), 100) : 0
  }));

  // Recent expenses this month (last 5)
  const recentExpenses = db.prepare(
    "SELECT * FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC LIMIT 5"
  ).all(req.user.id, month);

  res.json({
    month,
    totalBudget,
    totalSpent,
    remaining,
    isOverBudget: remaining < 0,
    overSpentBy:  remaining < 0 ? Math.abs(remaining) : 0,
    categoryBreakdown: breakdown,
    recentExpenses
  });
});

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

module.exports = router;
