# Project Structure

```
src/
├── App.tsx              # Main app with routing configuration
├── main.tsx             # React entry point
├── index.css            # Global styles and Tailwind imports
├── components/          # Reusable UI components
│   ├── Button.tsx       # Primary button component with variants
│   ├── Card.tsx         # Card container component
│   ├── Modal.tsx        # Modal dialog component
│   ├── Layout.tsx       # Main app layout with sidebar
│   ├── ProtectedRoute.tsx  # Auth guard wrapper
│   └── ...
├── pages/               # Route page components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Courses.tsx      # Course listing
│   ├── CourseView.tsx   # Single course view
│   ├── CourseOutline.tsx # Outline editor
│   ├── Onboarding.tsx   # New course creation flow
│   └── ...
├── contexts/            # React contexts
│   ├── AuthContext.tsx  # Authentication state
│   └── ThemeContext.tsx # Theme management
├── hooks/               # Custom React hooks
│   └── useSubscription.ts # Subscription state hook
├── lib/                 # External service clients
│   ├── supabase.ts      # Supabase client
│   ├── polar.ts         # Polar payments client
│   └── api.ts           # API utilities
├── types/               # TypeScript type definitions
│   ├── database.ts      # Supabase database types
│   └── onboarding.ts    # Onboarding flow types
├── utils/               # Utility functions
│   ├── audioStorage.ts  # Audio file handling
│   └── textProcessing.ts # Text utilities
└── styles/
    └── themes.css       # CSS custom properties for themes

supabase/
├── functions/           # Supabase Edge Functions (Deno)
│   ├── generate-outline/   # Course outline generation
│   ├── generate-lesson/    # Lesson content generation
│   ├── generate-audio/     # Single audio generation
│   ├── generate-course-audio/ # Batch audio generation
│   ├── regenerate-lesson/  # Lesson regeneration
│   ├── polar-webhook/      # Payment webhook handler
│   └── polar-portal/       # Customer portal redirect
└── migrations/          # Database migrations (SQL)
```

## Key Patterns

- **Pages** are full route components, **components** are reusable pieces
- **Contexts** provide global state (auth, theme)
- **Edge Functions** handle AI generation and payment webhooks
- **Database types** are manually maintained in `src/types/database.ts`
- Migrations are timestamped SQL files in `supabase/migrations/`
