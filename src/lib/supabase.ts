import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'editor' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'admin' | 'editor' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role: 'admin' | 'editor' | 'viewer'
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'admin' | 'editor' | 'viewer'
        }
      }
      client_profiles: {
        Row: {
          id: string
          team_id: string
          name: string
          industry: string
          target_audience: string
          brand_voice: string
          competitors: string[]
          goals: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          industry: string
          target_audience: string
          brand_voice: string
          competitors?: string[]
          goals?: string[]
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          industry?: string
          target_audience?: string
          brand_voice?: string
          competitors?: string[]
          goals?: string[]
        }
      }
      content_documents: {
        Row: {
          id: string
          team_id: string
          title: string
          content: string
          platform: 'linkedin' | 'twitter' | 'instagram' | 'blog' | 'facebook'
          status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published'
          scheduled_at: string | null
          published_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title: string
          content: string
          platform: 'linkedin' | 'twitter' | 'instagram' | 'blog' | 'facebook'
          status?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published'
          scheduled_at?: string | null
          published_at?: string | null
          created_by: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          content?: string
          platform?: 'linkedin' | 'twitter' | 'instagram' | 'blog' | 'facebook'
          status?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published'
          scheduled_at?: string | null
          published_at?: string | null
          created_by?: string
        }
      }
      analytics: {
        Row: {
          id: string
          content_id: string
          platform: string
          metrics: Record<string, any>
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          platform: string
          metrics: Record<string, any>
          date: string
        }
        Update: {
          id?: string
          content_id?: string
          platform?: string
          metrics?: Record<string, any>
          date?: string
        }
      }
    }
  }
}
