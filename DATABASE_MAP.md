# ContentForge Database Map

## Overview
This document provides a comprehensive map of all database tables, relationships, and data flow in the ContentForge application.

## Core Tables

### 1. Authentication & Users
```sql
auth.users (Supabase Auth)
├── id (UUID, Primary Key)
├── email
├── user_metadata
└── created_at

users (Custom User Data)
├── id (UUID, Primary Key) → auth.users.id
├── email
├── full_name
├── avatar_url
├── role (admin, editor, viewer)
├── last_active
├── device_info
├── location
└── created_at
```

### 2. Team Management
```sql
teams
├── id (UUID, Primary Key)
├── name
├── description
├── created_by (UUID) → users.id
├── created_at
└── updated_at

team_members
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── user_id (UUID) → users.id
├── role (admin, editor, viewer)
├── joined_at
└── permissions
```

### 3. Content Management
```sql
content_documents
├── id (UUID, Primary Key)
├── title
├── content (TEXT)
├── team_id (UUID) → teams.id
├── created_by (UUID) → users.id
├── created_at
├── updated_at
├── status (draft, review, published)
├── category (VARCHAR)
├── platform (linkedin, twitter, blog, etc.)
├── word_count (INTEGER)
├── collaborators (UUID[])
└── metadata (JSONB)

content_categories
├── id (UUID, Primary Key)
├── name
├── description
├── team_id (UUID) → teams.id
└── created_at

content_campaigns
├── id (UUID, Primary Key)
├── name
├── description
├── team_id (UUID) → teams.id
├── created_by (UUID) → users.id
├── start_date
├── end_date
├── status
└── created_at

content_templates
├── id (UUID, Primary Key)
├── name
├── content
├── platform
├── team_id (UUID) → teams.id
├── created_by (UUID) → users.id
└── created_at

content_comments
├── id (UUID, Primary Key)
├── document_id (UUID) → content_documents.id
├── user_id (UUID) → users.id
├── content
├── created_at
└── updated_at
```

### 4. AI & Research
```sql
client_profiles
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── company_name
├── industry
├── target_audience
├── brand_voice
├── key_messages
├── goals
├── competitors
├── created_by (UUID) → users.id
└── created_at

company_research
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── company_name
├── website_url
├── research_status (in_progress, completed, failed)
└── created_at

website_analysis
├── id (UUID, Primary Key)
├── research_id (UUID) → company_research.id
├── url
├── title
├── description
├── meta_keywords
├── content_summary
├── extracted_text
├── word_count
└── language

company_intelligence
├── id (UUID, Primary Key)
├── research_id (UUID) → company_research.id
├── business_type
├── industry
├── target_audience
├── value_proposition
├── key_services (TEXT[])
├── key_products (TEXT[])
├── pricing_info
├── key_messages (TEXT[])
├── competitive_advantages (TEXT[])
├── pain_points_addressed (TEXT[])
├── call_to_actions (TEXT[])
└── tone_of_voice

competitor_analysis
├── id (UUID, Primary Key)
├── research_id (UUID) → company_research.id
├── competitor_name
├── strengths
├── weaknesses
├── market_position
└── analysis_notes

research_sources
├── id (UUID, Primary Key)
├── research_id (UUID) → company_research.id
├── source_type
├── source_url
├── relevance_score
└── extracted_data
```

### 5. Analytics & Tracking
```sql
team_analytics
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── user_id (UUID) → users.id
├── event_type
├── event_data (JSONB)
├── platform
├── created_at
└── session_id

user_activity
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── user_id (UUID) → users.id
├── activity_type
├── activity_data (JSONB)
├── ip_address
├── user_agent
├── created_at
└── session_id

user_sessions
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── user_id (UUID) → users.id
├── session_id
├── device_type
├── browser
├── os
├── location
├── started_at
├── ended_at
└── duration

user_daily_stats
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── user_id (UUID) → users.id
├── date
├── content_generated
├── ai_requests
├── documents_created
├── time_spent
└── created_at

content_analytics
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── content_id (UUID) → content_documents.id
├── platform
├── views
├── likes
├── shares
├── comments
├── engagement_rate
├── created_at
└── updated_at
```

### 6. System Configuration
```sql
admin_configs
├── id (UUID, Primary Key)
├── key (VARCHAR, Unique)
├── value (TEXT)
├── category (ai, system, feature_flags)
├── description
├── updated_by (UUID) → users.id
├── created_at
└── updated_at

scheduled_posts
├── id (UUID, Primary Key)
├── team_id (UUID) → teams.id
├── content_id (UUID) → content_documents.id
├── platform
├── scheduled_for
├── status (scheduled, published, failed)
├── published_at
└── created_at
```

## Data Flow Diagram

```
User Authentication
    ↓
Team Assignment
    ↓
Content Creation (AI/Editor)
    ↓
Content Storage (content_documents)
    ↓
Scheduling (scheduled_posts)
    ↓
Publishing
    ↓
Analytics Tracking (content_analytics)
    ↓
Performance Reports
```

## Key Relationships

### 1. User → Team → Content
- Users belong to teams
- Teams own content documents
- Content is created by users within teams

### 2. Research → AI Content
- Company research informs AI content generation
- Client profiles guide content creation
- Research data is team-specific

### 3. Content → Analytics
- All content generates analytics events
- Analytics are tracked per team
- Performance data feeds back into content strategy

### 4. Admin Configuration
- System-wide settings stored in admin_configs
- AI models, feature flags, system parameters
- Accessible only to admin users

## Security (RLS Policies)

### Team-Based Access
- Users can only access data from their teams
- Team members have role-based permissions
- Admin users have system-wide access

### Content Privacy
- Content documents are team-scoped
- Research data is team-specific
- Analytics are isolated by team

## Indexes for Performance

### Primary Indexes
- `users.id` (Primary Key)
- `teams.id` (Primary Key)
- `content_documents.team_id`
- `team_analytics.team_id`
- `admin_configs.key`

### Composite Indexes
- `(team_id, created_at)` for content queries
- `(team_id, user_id, created_at)` for user activity
- `(team_id, platform, status)` for content filtering

## Future Considerations

### Scalability
- Consider partitioning large tables by team_id
- Implement data archiving for old analytics
- Add database connection pooling

### New Features
- Content versioning system
- Advanced scheduling (recurring posts)
- Multi-platform publishing
- Advanced analytics and reporting
- Content collaboration features

## Migration History

1. **Initial Setup** - Basic user and team structure
2. **Content System** - Document management and collaboration
3. **AI Integration** - Client profiles and content generation
4. **Research Tools** - Website analysis and company intelligence
5. **Analytics** - Team-based tracking and reporting
6. **Admin Panel** - System configuration management
7. **Current** - SproutSocial-inspired UI with full functionality

---

*Last Updated: December 2024*
*Database: Supabase PostgreSQL*
*ORM: Supabase Client*








