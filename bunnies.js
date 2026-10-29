const express = require("express");
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { ALL_BUNNIES, syncBunnies, progressHint } = require("../bunnyLogic");

const router = express.Router();

// ─── GET ALL BUNNIES ─────────────────────────────────────────────────────────
// Re-checks progress first, so bunnies appear as soon as a month is completed.
router.get("/", authenticateToken, (req, res) => {
  const earned = syncBunnies(req.user.id);

  const unlocked = db.prepare(
    `SELECT bunny_id, name, description, unlocked_at
     FROM bunnies WHERE user_id = ? ORDER BY bunny_id`
  ).all(req.user.id);

  const unlockedIds = new Set(unlocked.map(b => b.bunny_id));
  const locked = ALL_BUNNIES.filter(b => !unlockedIds.has(b.bunny_id));

  res.json({
    collected: unlocked.length,
    waiting: locked.length,
    totalBunnies: ALL_BUNNIES.length,
    unlockedBunnies: unlocked,
    lockedBunnies: locked,
    hint: progressHint(req.user.id, earned)
  });
});

// ─── UNLOCK BUNNY ────────────────────────────────────────────────────────────
// Bunnies are earned automatically, so manual unlocking is not allowed.
router.post("/unlock/:bunnyId", authenticateToken, (req, res) => {
  res.status(403).json({ error: "Bunnies are unlocked automatically after each successful month" });
});

module.exports = router;
