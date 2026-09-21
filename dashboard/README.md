# Midnight Dashboard

Modern web panel for Midnight Discord Bot.

## Features

- 🏠 **Dashboard**: View all guilds and bot status
- ⚙️ **Admin Panel**: Send messages to channels via bot
  - Plain text messages
  - Rich embed messages with colors
  - Channel and server selection
- 📊 **Server Stats**: View detailed statistics
  - Economy leaderboard (money, cookies, hearts, level, XP)
  - Message & voice activity
  - Invite tracking
  - Staff performance

## Installation

```bash
cd dashboard
npm install
```

## Development

```bash
npm run dev
```

Dashboard will be available at `http://localhost:5173`

Make sure the bot API is running on `http://localhost:3001`

## Build

```bash
npm run build
```

## Tech Stack

- ⚡ Vite
- ⚛️ React 18
- 🎨 TailwindCSS
- 🛣️ React Router
- 📡 Axios
