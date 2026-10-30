# GetAnywhere — Front‑end Prototype

This is a static SPA (HTML/CSS/JS) that demonstrates your marketplace idea:
- Login/Signup (with mock Google)
- Home with carousel, categories, search, filters
- Selling page (seller info kept private)
- Product details with reviews
- Auto‑Middleman escrow flow via Tickets
- Ticket Center (buyer/staff chat style)
- Admin Panel (full control: users, products, tickets, categories, settings)

> **Admin demo credentials**  
Email: `admin@getanywhere.app`  
Password: `admin123`

## How to run
Just open `index.html` in a browser (or host the folder on Netlify/Vercel).  
Everything is stored in `localStorage` (no real backend).

## Next steps (backend)
- Replace localStorage with a DB (PostgreSQL/Mongo).
- Real auth (JWT & OAuth).
- File uploads (S3/Cloudinary).
- Payments to platform wallet, ledger for escrow hold/release/refund.
- Role‑based chat (buyer ↔ staff) with WebSocket.
