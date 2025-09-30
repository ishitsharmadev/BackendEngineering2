# Oollert Tasks

Minimal Trello-like app for evaluation. Built with Node.js, Express, EJS and MongoDB.

Quick start

1. Copy `.env.example` to `.env` and edit `MONGO_URI` and `SESSION_SECRET`.
2. Install dependencies: npm install
3. Start MongoDB locally or use Atlas.
4. Run: npm run dev

Features implemented for first evaluation:
- Node.js + Express server
- EJS templating
- User signup/login with bcrypt and sessions
- Simple task board with three columns (todo, inprogress, done)
- Move tasks between columns

Notes for portability
- Works with local MongoDB or MongoDB Atlas. Provide connection in `.env`.
- Use `npm install` then `npm run dev` to start.
