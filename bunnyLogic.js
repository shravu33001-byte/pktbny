const db = require("./db");

// The 7 bunnies shown on bunnies.html, in unlock order.
// RULE: a brand-new user has ZERO bunnies. One bunny unlocks for every
// month of successful usage.
const ALL_BUNNIES = [
  { bunny_id: 1, name: "Sprout Carrot Bunny",      description: "Unlocked after your 1st successful month", milestone: "1 successful month"  },
  { bunny_id: 2, name: "Scholar Bunny",            description: "Unlocked after 2 successful months",       milestone: "2 successful months" },
  { bunny_id: 3, name: "Sunshine Bunny",           description: "Unlocked after 3 successful months",       milestone: "3 successful months" },
  { bunny_id: 4, name: "Rainbow Bunny",            description: "Unlocked after 4 successful months",       milestone: "4 successful months" },
  { bunny_id: 5, name: "Midnight Bunny",           description: "Unlocked after 5 successful months",       milestone: "5 successful months" },
  { bunny_id: 6, name: "Cosmic Bunny",             description: "Unlocked after 6 successful months",       milestone: "6 successful months" },
  { bunny_id: 7, name: "Strawberry Blossom Bunny", description: "Unlocked after 7 successful months",       milestone: "7 successful months" }
];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// A "successful month" is:
//   • a COMPLETED calendar month (the month in progress doesn't count yet),
//   • that is not before the month the account was created
//     (so back-dating expenses can't instantly farm bunnies),
//   • in which the user logged at least one expense, and
//   • in which they stayed within their total budget (if they have set one).
function monthlyTotals(userId) {
  return db.prepare(
    `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
     FROM expenses WHERE user_id = ? GROUP BY month`
  ).all(userId);
}

function countSuccessfulMonths(userId) {
  const user = db.prepare("SELECT created_at FROM users WHERE id = ?").get(userId);
  if (!user) return 0;
  const createdMonth = String(user.created_at).slice(0, 7); // "YYYY-MM"

  const budgetRow = db.prepare("SELECT total_budget FROM budgets WHERE user_id = ?").get(userId);
  const totalBudget = budgetRow ? budgetRow.total_budget : 0;

  const thisMonth = currentMonth();
  return monthlyTotals(userId).filter(m =>
    m.month &&
    m.month >= createdMonth &&
    m.month < thisMonth &&
    (totalBudget <= 0 || m.total <= totalBudget)
  ).length;
}

// Makes the bunnies table match exactly what the user has earned.
function syncBunnies(userId) {
  const earned = Math.min(countSuccessfulMonths(userId), ALL_BUNNIES.length);

  db.prepare("DELETE FROM bunnies WHERE user_id = ? AND bunny_id > ?").run(userId, earned);

  const upsert = db.prepare(
    `INSERT INTO bunnies (user_id, bunny_id, name, description) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, bunny_id) DO UPDATE SET name = excluded.name, description = excluded.description`
  );
  for (const b of ALL_BUNNIES.slice(0, earned)) {
    upsert.run(userId, b.bunny_id, b.name, b.description);
  }
  return earned;
}

// A friendly one-line status for the bunnies page.
function progressHint(userId, earned) {
  if (earned >= ALL_BUNNIES.length) return "You've collected every bunny — amazing saving!";
  const next = ALL_BUNNIES[earned];

  const budgetRow = db.prepare("SELECT total_budget FROM budgets WHERE user_id = ?").get(userId);
  const totalBudget = budgetRow ? budgetRow.total_budget : 0;
  const row = monthlyTotals(userId).find(m => m.month === currentMonth());

  if (!row) return `Log an expense this month and finish the month within budget to unlock ${next.name}.`;
  if (totalBudget > 0 && row.total > totalBudget) {
    return "You're over budget this month, so it won't count — next month is a fresh start!";
  }
  return `You're on track! ${next.name} unlocks when this month ends.`;
}

module.exports = { ALL_BUNNIES, syncBunnies, countSuccessfulMonths, progressHint, currentMonth };
