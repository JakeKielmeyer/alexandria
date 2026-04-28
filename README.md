# Alexandria

Browser-based creation and hosting platform for adult visual storytelling. React 19 + TypeScript + Vite + Supabase + Framer Motion + Zustand.

## Local dev

```bash
cp .env.example .env      # fill in Supabase values
pnpm install
pnpm dev
```

## Build

```bash
pnpm install --frozen-lockfile
pnpm build                # runs tsc -b && vite build, output in dist/
```

## Deploy — Cloudflare Pages

Hosting is **Cloudflare Pages** (not Vercel — explicit-content policy). Config lives in `wrangler.toml`; `public/_headers` and `public/_redirects` are picked up automatically by Pages.

Dashboard settings:

- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Build output directory: `dist`
- Node version env var: `NODE_VERSION=20`
- Environment variables: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for both Preview and Production. Optional: `VITE_SENTRY_DSN`.

## Database

SQL migrations live in `supabase-migrations/` and are applied manually in the Supabase SQL editor in filename order. The latest must-run set:

- `2026-04-20-transition-columns.sql` — reader transition persistence.
- `2026-04-20-rls-policies.sql` — Row Level Security on `stories`, `panels`, `layers`, `chunks`, `users`, and the `panels` storage bucket. **Required before any external user touches the site.**

## Reference docs

- `alexandria-handoff-prompt-v3.md` — product spec and stack decisions.
- `platform-design-spec.html` — visual design reference.

---

<details>
<summary>React + TypeScript + Vite template notes</summary>

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

</details>
