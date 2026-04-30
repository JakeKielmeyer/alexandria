import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Build-time public config (Supabase URL + anon key) is inlined here so the
// production build is self-contained and does not depend on Cloudflare Pages
// honoring `.env*` files. Values are still overridable by env vars (process
// env or `.env*`) for local dev — the hardcoded defaults are the fallback.
//
// Why hardcoded is safe: every `VITE_`-prefixed value is inlined into the
// client bundle by Vite, so it is already public regardless of where it
// is configured. Supabase RLS is what protects the data.
const SUPABASE_URL_DEFAULT = 'https://sbjzzvhsedokeneuinrj.supabase.co'
const SUPABASE_ANON_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNianp6dmhzZWRva2VuZXVpbnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjMzMDcsImV4cCI6MjA5MTU5OTMwN30.z7euPSnpVSvfmcK90OzUJd-w3ZbeNwzXZw9EecAY6CE'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || SUPABASE_URL_DEFAULT,
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_DEFAULT,
      ),
    },
  }
})
