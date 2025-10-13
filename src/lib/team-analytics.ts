// Team-Based Analytics System
// Proper tracking for teams and individual users within teams

import { supabase } from './supabase'

export interface TeamAnalytics {
  team_id: string
  date: string
  total_users: number
  active_users: number
  total_content_created: number
  total_ai_requests: number
  total_sessions: number
  popular_platforms: Record<string, number>
  popular_models: Record<string, number>
}

export interface UserActivity {
  team_id: string
  user_id: string
  activity_type: string
  activity_data?: Record<string, any>
  device_info?: {
    device_type: string
    browser: string
    os: string
    country?: string
    city?: string
  }
}

export class TeamAnalyticsTracker {
  private userId: string | null = null
  private teamId: string | null = null
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initialize()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initialize() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      this.userId = user?.id || null

      if (this.userId) {
        // Get user's team
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', this.userId)
          .single()

        this.teamId = teamMember?.team_id || null
        console.log('Team analytics initialized:', { userId: this.userId, teamId: this.teamId })
      }
    } catch (error) {
      console.error('Team analytics initialization error:', error)
    }
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent
    return {
      device_type: this.getDeviceType(userAgent),
      browser: this.getBrowser(userAgent),
      os: this.getOS(userAgent)
    }
  }

  private getDeviceType(userAgent: string): string {
    if (/tablet|ipad/i.test(userAgent)) return 'tablet'
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
    return 'Other'
  }

  async trackActivity(activityType: string, activityData?: Record<string, any>) {
    if (!this.userId || !this.teamId) {
      console.log('No user or team ID, skipping analytics')
      return
    }

    try {
      console.log('Tracking team activity:', { activityType, activityData })
      
      const { error } = await supabase.rpc('track_user_activity', {
        p_team_id: this.teamId,
        p_user_id: this.userId,
        p_activity_type: activityType,
        p_activity_data: activityData || {},
        p_user_agent: navigator.userAgent
      })

      if (error) {
        console.error('Team analytics tracking error:', error)
      } else {
        console.log('Team activity tracked successfully:', activityType)
      }
    } catch (error) {
      console.error('Team analytics error:', error)
    }
  }

  // Specific tracking methods
  async trackPageView(page: string) {
    await this.trackActivity('page_view', { page })
  }

  async trackContentCreated(platform: string, topic: string, contentType: string = 'social_post') {
    await this.trackActivity('content_created', {
      platform,
      topic: topic.substring(0, 100), // Truncate for privacy
      content_type: contentType
    })
  }

  async trackAIRequest(model: string, tokens?: number, duration?: number) {
    await this.trackActivity('ai_request', {
      model,
      tokens,
      duration_ms: duration
    })
  }

  async trackContentSaved(platform: string, topic: string) {
    await this.trackActivity('content_saved', {
      platform,
      topic: topic.substring(0, 100)
    })
  }

  async trackError(error: string, context: string) {
    await this.trackActivity('error', {
      error_message: error,
      context
    })
  }

  async trackUserAction(action: string, details?: Record<string, any>) {
    await this.trackActivity('user_action', {
      action,
      details
    })
  }

  // Get team analytics
  async getTeamAnalytics(days: number = 30) {
    try {
      const { data, error } = await supabase
        .from('team_analytics')
        .select('*')
        .eq('team_id', this.teamId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get team analytics error:', error)
      return []
    }
  }

  // Get user activity within team
  async getUserActivity(userId?: string, days: number = 30) {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('team_id', this.teamId)
        .eq('user_id', userId || this.userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user activity error:', error)
      return []
    }
  }

  // Get team members activity
  async getTeamMembersActivity(days: number = 30) {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select(`
          *,
          users(email, user_metadata)
        `)
        .eq('team_id', this.teamId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get team members activity error:', error)
      return []
    }
  }
}

// Create global instance
export const teamAnalytics = new TeamAnalyticsTracker()











