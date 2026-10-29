// Demo helper: pretend an account has been used for N successful months so you
// can SEE bunnies unlock without waiting.
//
//   node scripts/demo-bunnies.js you@example.com 3
//
// It moves the account's creation date back N months, adds one small expense
// in each of those past months (if that month has none), then re-syncs bunnies.
const db = require("../db");
const { syncBunnies } = require("../bunnyLogic");

const email = (process.argv[2] || "").trim().toLowerCase();
const months = parseInt(process.argv[3] || "1", 10);

if (!email || !(months >= 1 && months <= 7)) {
  console.log("Usage: node scripts/demo-bunnies.js <email> <months 1-7>");
  process.exit(1);
}

const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email);
if (!user) {
  console.log("No account found for " + email);
  process.exit(1);
}

const now = new Date();
const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const first = new Date(now.getFullYear(), now.getMonth() - months, 1);

db.prepare("UPDATE users SET created_at = ? WHERE id = ?")
  .run(`${monthKey(first)}-01 09:00:00`, user.id);

for (let i = months; i >= 1; i--) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
  const key = monthKey(d);
  const has = db.prepare(
    "SELECT 1 FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?"
  ).get(user.id, key);
  if (!has) {
    db.prepare(
      "INSERT INTO expenses (user_id, description, amount, category, date) VALUES (?, 'Demo expense', 100, 'other', ?)"
    ).run(user.id, `${key}-15`);
  }
}

console.log(`Done — ${syncBunnies(user.id)} bunny(ies) unlocked for ${email}.`);
