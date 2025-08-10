# Connect Friends

A modern, private social-graph and messaging app. Build and visualize connections, organize Micro Circles, send messages (one-to-one or to circles), and manage your community with a clean host dashboard. Mobile-friendly with smooth UI and a glassy blue theme.

Demo (YouTube)

- https://youtu.be/uljGym83FXw?si=gQd5Lx--R3U1Fsnf

## Tech Stack

- Framework: Next.js (App Router) + React + TypeScript
- RPC/API: tRPC
- UI: Tailwind CSS + shadcn/ui, Framer Motion, lucide-react
- Embeds: Spotify (react-spotify-embed), YouTube/YouTube Music (nocookie embeds), Apple Music (embed.music.apple.com)
- State/Queries: React Query via tRPC hooks
- Data: MongoDB (or your DB) through the backend tRPC routers
- Tooling: ESLint, Prettier
- Media: Cloudinary
- cache: Redis

## Features

- Interactive connection graph

  - Create/delete single or multiple connections
  - Multi-select users and batch connect/remove
  - Micro Circles (grouping), colors, and labels
  - Mobile-optimized selection cards (never clipped, bottom overlay)
  - Activity ledger for connection create/delete

- Messaging

  - Direct or Circle messages
  - Attachments: images, videos, files
  - “Note to Self” conversations
  - Clean inbox with last message preview and timestamps

- Music & Notes

  - Embeds for Spotify, YouTube/YouTube Music, Apple Music
  - Notes with character limit and live counter

- Host Dashboard

  - Users list, Invites, Quick Connect, Circles manager, Ledger
  - Uses batch create/delete APIs for reliability
  - UNO game lobby gating (host can start only when all humans are ready)

- Polished UX
  - Global 404 (not-found) page that matches the theme
  - Responsive layouts, safe-area support, subtle motion

## Project Structure (key folders)

- src/app
  - (dashboard)/host/... — Host views (graph, users, invites, ledger, etc.)
  - (dashboard)/user/... — User settings
  - \_components — Shared components (connection_Graph, conversation, etc.)
  - not-found.tsx — Global 404 page
- backend/routers — tRPC routers (connection, conversation, etc.)
- utils/providers/TrpcProviders — tRPC client/provider setup

Your exact files may vary, but the layout above is the general shape.

## Getting Started (Local)

Prerequisites

- Node.js 18+ and npm (or pnpm/yarn)
- A MongoDB connection string (or your DB of choice)
- Git

1. Clone and install

- Windows (PowerShell)
  git clone <your-repo-url> d:\hobby\connect_friends
  cd d:\hobby\connect_friends
  npm install

2. Environment variables
   Create a .env.local file in the project root:

MONGO_DB

REDIS_USER (redis cloud)
REDIS_PASS (redis cloud)
REDIS_HOST (redis cloud)
REDIS_PORT (redis cloud)
REDIS_OLD_URL (redis upstash)
REDIS_OLD_TOKEN (redis upstash)

SECRET (any string)

EMAIL_USER
EMAIL_PASS

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OAUTH_REDIRECT_URL_BASE

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

3. Run the dev server

- Windows (PowerShell)
  npm run dev

Open http://localhost:3000 in your browser.

4. Build and run production locally

- Windows (PowerShell)
  npm run build
  npm run start

## Common Scripts

- npm run dev — Start Next.js in development
- npm run build — Production build
- npm run start — Start the production server
- npm run lint — Lint the codebase

## Hosting Locally (Summary)

- Ensure MongoDB URI (or your DB) is reachable from your machine.
- Use npm run dev for development. For local prod-like testing, use npm run build && npm run start.
- No separate API server needed: tRPC routers run inside Next.js.

## Deploy

- Vercel (recommended for Next.js):

  - Push to GitHub and import the repo in Vercel.
  - Add the same environment variables from .env.local to Vercel Project Settings.
  - Deploy. Vercel will build and host the Next.js + tRPC app.

- Other Node hosts:
  - Build (npm run build), then run (npm run start) behind a reverse proxy.
  - Provide the same environment variables on the server.

## Security & Privacy

- tRPC endpoints validate on the server; do not rely solely on client checks.
- Be mindful of PII in logs and attachments. Use signed URLs or a storage service if you move away from base64 attachments.
