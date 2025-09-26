// Simple Analytics - Basic user tracking
import { supabase } from './supabase'

export class SimpleAnalytics {
  private userId: string | null = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      this.userId = user?.id || null
      console.log('Analytics initialized for user:', this.userId)
    } catch (error) {
      console.error('Analytics initialization error:', error)
    }
  }

  async trackEvent(eventType: string, eventData?: Record<string, any>) {
    if (!this.userId) {
      console.log('No user ID, skipping analytics')
      return
    }

    try {
      console.log('Tracking event:', eventType, eventData)
      
      const { data, error } = await supabase
        .from('user_analytics')
        .insert({
          user_id: this.userId,
          event_type: eventType,
          event_data: eventData || {}
        })
        .select()

      if (error) {
        console.error('Analytics tracking error:', error)
        console.error('Error details:', error.message, error.details)
      } else {
        console.log('Event tracked successfully:', eventType, 'Data:', data)
      }
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }

  async trackPageView(page: string) {
    await this.trackEvent('page_view', { page })
  }

  async trackContentCreated(platform: string, topic: string) {
    await this.trackEvent('content_created', { platform, topic })
  }

  async trackAIRequest(model: string) {
    await this.trackEvent('ai_request', { model })
  }

  async trackError(error: string) {
    await this.trackEvent('error', { error_message: error })
  }
}

// Create global instance
export const simpleAnalytics = new SimpleAnalytics()
