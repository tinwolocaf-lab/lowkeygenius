# Tech Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Icons**: Lucide React
- **Notifications**: react-hot-toast
- **Markdown**: react-markdown with remark-gfm and rehype-highlight

## Backend
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **AI**: Google Gemini API (gemini-2.5-flash-lite model)
- **Payments**: Polar SDK for subscriptions
- **Audio TTS**: Murf AI

## Development

### Commands
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
```

### Environment Variables
Required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Edge functions require (set in Supabase dashboard):
- `GEMINI_API_KEY` - Google Gemini API key
- `MURF_API_KEY` - Murf AI API key
- `POLAR_ACCESS_TOKEN` - Polar payment access token

## Code Conventions

- Use TypeScript strict mode
- Functional components with hooks
- Named exports for components
- Types defined in `src/types/`
- Supabase client initialized in `src/lib/supabase.ts`
- Use `Database` type from `src/types/database.ts` for type-safe Supabase queries
