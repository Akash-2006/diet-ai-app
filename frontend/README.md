# Frontend

**Next.js 14** (App Router) · **Tailwind CSS** · **[shadcn/ui](https://ui.shadcn.com/)** — scaffold for issue **#7**.

## Scripts

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start
npm run lint
```

## Stack notes

- **Tailwind CSS v3** theme tokens wired for shadcn-style CSS variables (`app/globals.css` + `tailwind.config.ts`).
- Import alias: `@/` → project root (`components.json`, `tsconfig.json`).
- **`components/ui/button.tsx`**: Radix `Slot` + `class-variance-authority` (classic shadcn pattern). Add more components with `npx shadcn@latest add …` locally as needed.

Later issues wire the API client, encryption, chat, uploads, and tests.
