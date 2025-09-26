// Enhanced User Analytics and Tracking
import { supabase } from './supabase'

export interface UserEvent {
  event_type: string
  event_data?: Record<string, any>
  page_url?: string
  referrer?: string
}

export interface DeviceInfo {
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  screen_resolution: string
  timezone: string
  language: string
}

export class AnalyticsTracker {
  private sessionId: string
  private userId: string | null = null
  private isTracking: boolean = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeTracking()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeTracking() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      this.userId = user?.id || null

      // Track page view
      this.trackEvent('page_view', {
        page: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      })

      // Track session start
      if (this.userId) {
        await this.trackEvent('session_start', {
          session_id: this.sessionId,
          timestamp: new Date().toISOString()
        })
      }

      this.isTracking = true
    } catch (error) {
      console.error('Analytics initialization error:', error)
    }
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent
    const screen = window.screen

    return {
      device_type: this.getDeviceType(userAgent),
      browser: this.getBrowser(userAgent),
      os: this.getOS(userAgent),
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    }
  }

  private getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
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

  private async getLocationInfo(): Promise<{ country?: string; city?: string }> {
    try {
      // You can integrate with IP geolocation services here
      // For now, we'll return empty values
      return {}
    } catch (error) {
      console.error('Location tracking error:', error)
      return {}
    }
  }

  async trackEvent(eventType: string, eventData?: Record<string, any>, pageUrl?: string) {
    if (!this.isTracking) return

    try {
      const deviceInfo = this.getDeviceInfo()
      const locationInfo = await this.getLocationInfo()

      const event: UserEvent = {
        event_type: eventType,
        event_data: {
          ...eventData,
          device_info: deviceInfo,
          location: locationInfo,
          timestamp: new Date().toISOString()
        },
        page_url: pageUrl || window.location.href,
        referrer: document.referrer
      }

      if (this.userId) {
        // Use the database function to track the event
        const { error } = await supabase.rpc('track_user_event', {
          p_user_id: this.userId,
          p_event_type: eventType,
          p_event_data: event.event_data,
          p_session_id: this.sessionId,
          p_user_agent: navigator.userAgent,
          p_page_url: event.page_url
        })

        if (error) {
          console.error('Analytics tracking error:', error)
        }
      }

      // Also track in localStorage for offline analytics
      this.trackOffline(event)
    } catch (error) {
      console.error('Event tracking error:', error)
    }
  }

  private trackOffline(event: UserEvent) {
    try {
      const offlineEvents = JSON.parse(localStorage.getItem('offline_analytics') || '[]')
      offlineEvents.push(event)
      
      // Keep only last 100 events to prevent storage bloat
      if (offlineEvents.length > 100) {
        offlineEvents.splice(0, offlineEvents.length - 100)
      }
      
      localStorage.setItem('offline_analytics', JSON.stringify(offlineEvents))
    } catch (error) {
      console.error('Offline tracking error:', error)
    }
  }

  // Specific tracking methods
  async trackPageView(page: string, title?: string) {
    await this.trackEvent('page_view', {
      page,
      title: title || document.title
    })
  }

  async trackLogin(method: string = 'email') {
    await this.trackEvent('login', {
      method,
      timestamp: new Date().toISOString()
    })
  }

  async trackLogout() {
    await this.trackEvent('logout', {
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    })
  }

  async trackContentCreated(contentType: string, platform: string, topic: string) {
    await this.trackEvent('content_created', {
      content_type: contentType,
      platform,
      topic,
      timestamp: new Date().toISOString()
    })
  }

  async trackAIRequest(model: string, tokens: number, duration: number) {
    await this.trackEvent('ai_request', {
      model,
      tokens,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  }

  async trackError(error: string, context: string) {
    await this.trackEvent('error', {
      error_message: error,
      context,
      timestamp: new Date().toISOString()
    })
  }

  async trackUserAction(action: string, details?: Record<string, any>) {
    await this.trackEvent('user_action', {
      action,
      details,
      timestamp: new Date().toISOString()
    })
  }

  // Get user analytics data
  async getUserAnalytics(userId?: string) {
    try {
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId || this.userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get analytics error:', error)
      return []
    }
  }

  // Get user activity summary
  async getUserActivitySummary(userId?: string) {
    try {
      const { data, error } = await supabase
        .from('user_activity_summary')
        .select('*')
        .eq('user_id', userId || this.userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get activity summary error:', error)
      return null
    }
  }
}

// Create global analytics instance
export const analytics = new AnalyticsTracker()

// Auto-track common events
if (typeof window !== 'undefined') {
  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      analytics.trackEvent('page_hidden')
    } else {
      analytics.trackEvent('page_visible')
    }
  })

  // Track before unload
  window.addEventListener('beforeunload', () => {
    analytics.trackEvent('page_unload', {
      session_id: analytics['sessionId']
    })
  })

  // Track clicks on external links
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    
    if (link && link.hostname !== window.location.hostname) {
      analytics.trackEvent('external_link_click', {
        url: link.href,
        text: link.textContent
      })
    }
  })
}
