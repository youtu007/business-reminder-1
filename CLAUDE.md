# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

车辆业务管理系统 (Vehicle Business Reminder System) — a three-part app for managing vehicle collection business: customer tracking, salesman assignment, overdue monitoring, and image documentation.

Language: Chinese UI throughout. All user-facing strings, error messages, and field names are in Chinese.

## Development Commands

### Server (Express + MongoDB)
```bash
cd server
npm install
cp .env.example .env   # first time only — edit with real MongoDB URI, JWT secret, WX credentials
npm run dev             # nodemon on src/app.js, default port 3000
npm start               # production
```

### Admin (Vue 3 + Vite)
```bash
cd admin
npm install
npm run dev             # Vite dev server on port 8080, proxies /api → localhost:3000
npm run build           # output to admin/dist/
```

### Miniprogram (WeChat native)
Open `miniprogram/` directory in WeChat DevTools. Set `baseUrl` in `miniprogram/app.js` to point to your backend.

## Architecture

### Three independent apps, one repo
- **server/** — Express REST API, CommonJS (`require`). Entry: `src/app.js`. Connects to MongoDB via Mongoose, seeds default admin and configs on startup.
- **admin/** — Vue 3 SPA, ES modules. Uses ElementPlus (auto-imported via unplugin), Pinia for state, vue-router with auth guard. All API calls go through `src/api/index.js` (single axios instance with token interceptor).
- **miniprogram/** — Native WeChat miniprogram. Auth via phone number → `POST /api/auth/wx/login`. Global `app.request()` wrapper handles token injection and 401 redirect.

### Server internals
- **Routes** (`src/routes/`): auth, users, customers, upload, overdueRules, configs, export, ocr. All under `/api/` prefix.
- **Models** (`src/models/`): User, Customer, AssignmentLog, OverdueRule, Config. Customer is the largest model with conditional validation (fields required only when `isDraft === false`).
- **Middleware**: `auth.js` provides `authenticate` (JWT verify) and `requireAdmin` (role check). `upload.js` uses multer for file uploads to `server/uploads/`.
- **Services**: `overdueService.js` — cron job at 9am daily evaluates active OverdueRule documents against non-completed customers, marking matches as overdue.
- **Logging**: Winston with daily-rotate-file, logs to `server/logs/`.

### Auth flow
- Admin: username/password → JWT token stored in localStorage
- Miniprogram: phone number → same JWT system, stored in wx.Storage
- Two roles: `admin` (full access) and `salesman` (scoped to assigned customers)

### Customer status lifecycle
`pending` (未入库) → `stored` (已入库) → `completed` (已完成). Any non-completed customer can be marked `overdue` by the scheduler based on configurable OverdueRule conditions.

### Config-driven fields
Banks, customer sources, and collection plans are stored in the Config model and editable via admin Settings page — not hardcoded.
