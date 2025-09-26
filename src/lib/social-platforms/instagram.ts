'use client'

interface InstagramPost {
  text: string
  media: {
    type: 'image' | 'video'
    url: string
  }
  mediaType: 'FEED' | 'STORY' | 'REEL'
}

interface InstagramResponse {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  permalink: string
  timestamp: string
  caption?: string
}

export class InstagramConnector {
  private accessToken: string
  private userId: string

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken
    this.userId = userId
  }

  async publishPost(post: InstagramPost): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // Instagram requires a two-step process:
      // 1. Create media container
      // 2. Publish the container
      
      const containerPayload = {
        image_url: post.media.type === 'image' ? post.media.url : undefined,
        video_url: post.media.type === 'video' ? post.media.url : undefined,
        caption: post.text,
        media_type: post.mediaType === 'FEED' ? 'IMAGE' : 'STORY',
        ...(post.mediaType === 'STORY' && {
          story_sticker_ids: ['time_sticker_id'] // Optional story stickers
        })
      }

      // Step 1: Create media container
      const containerResponse = await fetch(`https://graph.facebook.com/v18.0/${this.userId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerPayload)
      })

      if (!containerResponse.ok) {
        const errorData = await containerResponse.json()
        throw new Error(`Instagram API Error: ${errorData.error?.message || containerResponse.statusText}`)
      }

      const containerData = await containerResponse.json()
      const containerId = containerData.id

      // Step 2: Publish the container
      const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${this.userId}/media_publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creation_id: containerId
        })
      })

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json()
        throw new Error(`Instagram Publish Error: ${errorData.error?.message || publishResponse.statusText}`)
      }

      const publishData = await publishResponse.json()
      
      return {
        success: true,
        postId: publishData.id
      }
    } catch (error) {
      console.error('Instagram publishing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video'): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      // For Instagram, media needs to be uploaded to a public URL first
      // This is a placeholder - in production, you'd upload to your own CDN
      console.log('Uploading media for Instagram:', mediaUrl, mediaType)
      
      return {
        success: true,
        mediaId: `instagram_media_${Date.now()}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.userId}?fields=id,username,account_type,media_count`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Instagram API Error: ${response.statusText}`)
      }

      const profile = await response.json()
      return {
        success: true,
        profile
      }
    } catch (error) {
      console.error('Instagram profile error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const result = await this.getProfile()
      return result.success
    } catch {
      return false
    }
  }
}

// OAuth helper functions
export const getInstagramAuthUrl = (clientId: string, redirectUri: string, state: string) => {
  const scope = 'user_profile,user_media'
  return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`
}

export const exchangeInstagramCode = async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
  try {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json()
    return {
      success: true,
      accessToken: data.access_token,
      userId: data.user_id,
      expiresIn: data.expires_in
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
