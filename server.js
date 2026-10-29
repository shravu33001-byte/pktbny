const express = require("express");
const path = require("path");

const authRoutes    = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");
const budgetRoutes  = require("./routes/budget");
const summaryRoutes = require("./routes/summary");
const bunnyRoutes   = require("./routes/bunnies");

const app = express();
const PUBLIC_DIR = path.join(__dirname, "public");

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());

// CORS: lets the pages also work if you open them from another origin
// (e.g. VS Code Live Server) while this server runs on port 3000.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/budget",   budgetRoutes);
app.use("/summary",  summaryRoutes);
app.use("/bunnies",  bunnyRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "🐰 Pocket Bunny API is running!", version: "1.0.0" });
});

// ─── FRONTEND ─────────────────────────────────────────────────────────────────
// The site STARTS at the sign-up page. (signup.html sends already-signed-in
// people straight on to the home page.)
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "signup.html")));
app.use(express.static(PUBLIC_DIR, { index: false }));

// ─── FALLBACKS ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.method === "GET" && req.accepts(["html", "json"]) === "html") {
    return res.redirect("/");
  }
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🐰 Pocket Bunny is running → open http://localhost:${PORT}`);
  });
}

module.exports = app;
