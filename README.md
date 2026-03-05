# UniTrade OAU

Foundational modular marketplace architecture for OAU students using:
- Frontend: React (JS/JSX only)
- Backend: Node.js + Express
- Database/Storage: Supabase PostgreSQL + Storage
- Icons: react-icons

## Project Structure

- `supabase/schema.sql` – SQL schema, relations, indexes, seed categories, and RLS policies.
- `backend/` – Express API with modular layers (`routes`, `controllers`, `services`, `middlewares`, `config`).
- `frontend/` – React app with component-based architecture (`components`, `pages`, `utils`, `context`).

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Expected `.env` values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` if your API is not on `http://localhost:4000/api`.
