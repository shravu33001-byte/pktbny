const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "pocket_bunny_secret_key_2024";

// Every protected route uses this. On any token problem we answer 401 with
// code "TOKEN_INVALID" – the frontend uses that code (and only that code) to
// know the session is over and send the person back to the login page.
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Please sign in to continue", code: "TOKEN_INVALID" });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Your session has expired. Please sign in again", code: "TOKEN_INVALID" });
  }

  // The account might have been deleted since the token was issued.
  const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(payload.id);
  if (!exists) {
    return res.status(401).json({ error: "This account no longer exists", code: "TOKEN_INVALID" });
  }

  req.user = payload;
  next();
}

module.exports = { authenticateToken, JWT_SECRET };
