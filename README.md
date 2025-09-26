# ContentForge

AI-powered content generation, collaboration, and scheduling platform built with Next.js, Supabase, and OpenRouter.

## Features

- 🤖 **AI Content Generation** - Multi-LLM support via OpenRouter
- 👥 **Real-time Collaboration** - Google Docs-style editing with Yjs
- 📅 **Smart Scheduling** - Custom calendar and kanban for content planning
- 📊 **Analytics Dashboard** - Track performance across social platforms
- 🔐 **Team Management** - Role-based permissions and team collaboration
- 💳 **Subscription Management** - Stripe integration for billing

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Database, Auth, Realtime)
- **AI**: OpenRouter (Multi-LLM access)
- **Payments**: Stripe
- **Collaboration**: Yjs, Tiptap
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- OpenRouter API key
- Stripe account (for payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd contentforge
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Fill in your environment variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up Supabase database
- Run the SQL schema in `supabase-schema.sql` in your Supabase SQL editor
- Enable Row Level Security (RLS) policies

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── ui/               # Reusable UI components
│   └── editor/           # Collaborative editor
├── lib/                  # Utility functions
│   ├── supabase.ts       # Supabase client
│   ├── openrouter.ts     # OpenRouter integration
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
```

## Key Features

### AI Content Generation
- Multi-platform content creation (LinkedIn, Twitter, Instagram, Blog)
- Client-specific content based on brand profile
- Multiple LLM support via OpenRouter

### Real-time Collaboration
- Google Docs-style collaborative editing
- User presence indicators
- Real-time cursors and selections
- Comment system for feedback

### Smart Scheduling
- Custom calendar interface
- Drag-and-drop content scheduling
- Platform-specific formatting
- Automated posting (when integrated with social APIs)

### Analytics & Insights
- Performance tracking across platforms
- Engagement metrics
- Content optimization suggestions
- Team collaboration insights

## Database Schema

The application uses Supabase with the following main tables:
- `users` - User profiles and authentication
- `teams` - Team/organization management
- `team_members` - Team membership and roles
- `client_profiles` - AI configuration and brand data
- `content_documents` - Content creation and management
- `analytics` - Performance tracking data
- `document_sessions` - Real-time collaboration state

## API Integration

### OpenRouter
- Multi-LLM access (GPT-4, Claude, etc.)
- Cost-effective content generation
- Pay-per-use pricing model

### Supabase
- PostgreSQL database with real-time subscriptions
- Row Level Security (RLS) for data protection
- Built-in authentication and user management

### Stripe
- Subscription management
- Payment processing
- Webhook handling for billing events

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
Ensure all environment variables are set in your Vercel project settings.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.