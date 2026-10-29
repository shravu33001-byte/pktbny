# 🐰 Pocket Bunny

Express + SQLite backend, static HTML frontend, served together from ONE port.

## Run it
```
npm install        # only if node_modules is missing
npm start
```
Open **http://localhost:3000** – the site starts at **Sign Up**, then goes to **Home**.

## Flow
Sign Up → Home → Set Budget / Add Expense / Monthly Summary / View Target Budget /
Transaction History (edit + delete) / Portal to Bunnies / Settings (profile, password,
dark mode, preferences, help, privacy, terms, logout, delete account).

## Bunnies
A new account has **0 bunnies**. One unlocks for every *successful month*: a completed
calendar month (on/after the month you signed up) with at least one expense and total
spending within your total budget (if you set one).
To preview it without waiting:  `npm run demo-bunnies -- you@example.com 3`

## Notes
- Database `pocket_bunny.db` is created automatically on first run.
- Env vars: `PORT` (default 3000), `JWT_SECRET` (set your own for real use), `DB_PATH`.
- Email notifications / monthly reports switches save your preference only (no emails are sent).
- Two-factor authentication is shown as "coming soon".
- API routes are unchanged (/auth, /expenses, /budget, /summary, /bunnies) plus `PUT /auth/profile`.
