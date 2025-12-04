# Progent 🎓

An AI-powered course generation platform that allows users to create personalized learning courses on any topic.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)

## ✨ Features

- **AI Course Generation** - Input a topic, level, and intensity; the system generates a complete course outline with modules and lessons
- **Lesson Content Generation** - AI generates detailed markdown lesson content using Google Gemini
- **Audio Narration** - Text-to-speech conversion for lessons using Murf AI
- **Progress Tracking** - Track completion across courses and lessons
- **Notes System** - Save snippets from lessons as personal notes
- **Flashcards & Quizzes** - Generate flashcards and quizzes from lesson content
- **Multiple Themes** - Light, dark, and special themed modes including a 🎃 Horror theme
- **Subscription Tiers** - FREE, PLUS, PRO, PRO_MAX plans with varying course limits

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Gemini API key
- Murf AI API key (for audio features)
- Polar account (for payments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/progent.git
cd progent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase Edge Function secrets (in Supabase dashboard):
- `GEMINI_API_KEY` - Google Gemini API key
- `MURF_API_KEY` - Murf AI API key
- `POLAR_ACCESS_TOKEN` - Polar payment access token

5. Run database migrations:
```bash
npx supabase db push
```

6. Start the development server:
```bash
npm run dev
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Icons**: Lucide React
- **Notifications**: react-hot-toast
- **Markdown**: react-markdown with remark-gfm and rehype-highlight
- **Diagrams**: Mermaid.js

### Backend
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **AI**: Google Gemini API
- **Payments**: Polar SDK for subscriptions
- **Audio TTS**: Murf AI

## 📁 Project Structure

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
│   ├── horror/          # Horror theme specific components
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
├── lib/                 # External service clients
│   ├── supabase.ts      # Supabase client
│   ├── polar.ts         # Polar payments client
│   └── api.ts           # API utilities
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/
    └── themes.css       # CSS custom properties for themes

supabase/
├── functions/           # Supabase Edge Functions (Deno)
│   ├── generate-outline/   # Course outline generation
│   ├── generate-lesson/    # Lesson content generation
│   ├── generate-audio/     # Single audio generation
│   ├── generate-course-audio/ # Batch audio generation
│   ├── generate-flashcards/   # Flashcard generation
│   ├── generate-quiz/      # Quiz generation
│   └── ...
└── migrations/          # Database migrations (SQL)
```

## 🎨 Theming

Progent supports multiple themes:
- **Blue Light** (default)
- **Pink Light**
- **Blue Dark**
- **Pink Dark**
- **🎃 Horror** - A spooky Halloween-inspired theme with blood-red accents, eerie animations, and ghostly effects

Themes are managed via CSS custom properties and React context, allowing seamless switching without page reload.

## 👤 User Flow

1. Sign up/login via Supabase Auth
2. Create a new course through the onboarding flow (topic, level, intensity)
3. Review and edit the AI-generated outline
4. Generate lesson content for each lesson
5. Optionally generate audio narration
6. Study the course with progress tracking
7. Create flashcards and take quizzes to reinforce learning

## 💳 Subscription Tiers

| Tier | Monthly Courses | Features |
|------|-----------------|----------|
| FREE | 2 | Basic course generation |
| PLUS | 5 | + Audio generation |
| PRO | 15 | + Priority generation |
| PRO_MAX | Unlimited | All features |

## 🔧 Code Conventions

- TypeScript strict mode enabled
- Functional components with hooks
- Named exports for components
- Types defined in `src/types/`
- Supabase client initialized in `src/lib/supabase.ts`
- Use `Database` type from `src/types/database.ts` for type-safe Supabase queries

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Please contact the maintainers for contribution guidelines.
