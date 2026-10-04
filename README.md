# BuddyBoost Pro 🚀

A study productivity web app that combines a study planner, Pomodoro timer, ambient sounds, flashcards, and analytics in one place — with dark/light mode support.

## Features

- 📅 **Study Planner** — organize your study sessions and tasks
- ⏱️ **Pomodoro Timer** — focused work/break intervals to keep you on track
- 🎧 **Ambient Sounds** — background audio to help you concentrate
- 🃏 **Flashcards** — quick review and memorization
- 📊 **Analytics** — track your study time and productivity trends
- 🔥 **Streak Counter** — stay motivated with daily streaks
- 🌗 **Dark / Light Mode** — comfortable studying any time of day

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- bun (recommended) or npm/pnpm

### Install & Run

```bash
bun install
bun run dev
```

Then open the app at the local dev URL (default: `http://localhost:8080`).

### Build for Production

```bash
bun run build
bun run preview
```

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (React 19, Vite 7)
- [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS v4](https://tailwindcss.com/)
- shadcn/ui-style components (Radix UI)

## Notes

- Your progress (plans, streaks, analytics) is saved **locally in your browser** — it won't sync across devices.
- Ambient sounds and the timer run entirely client-side.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `bun run dev`     | Start the dev server         |
| `bun run build`   | Production build             |
| `bun run preview` | Preview the production build |
| `bun run test`    | Run tests                    |
| `bun run lint`    | Lint the codebase            |

## License

MIT
