'use client'

interface LinkedInPost {
  text: string
  media?: {
    type: 'image' | 'video'
    url: string
  }
  visibility: 'PUBLIC' | 'CONNECTIONS'
}

interface LinkedInResponse {
  id: string
  created: {
    time: number
  }
  lastModified: {
    time: number
  }
  author: string
  lifecycleState: 'PUBLISHED' | 'DRAFT'
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string
      }
      shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO'
      media?: Array<{
        status: 'READY'
        description: {
          text: string
        }
        media: string
        title: {
          text: string
        }
      }>
    }
  }
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONNECTIONS'
  }
}

export class LinkedInConnector {
  private accessToken: string
  private personUrn: string

  constructor(accessToken: string, personUrn: string) {
    this.accessToken = accessToken
    this.personUrn = personUrn
  }

  async publishPost(post: LinkedInPost): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const payload = {
        author: this.personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: post.text
            },
            shareMediaCategory: post.media ? post.media.type.toUpperCase() : 'NONE',
            ...(post.media && {
              media: [{
                status: 'READY',
                description: {
                  text: post.text
                },
                media: post.media.url,
                title: {
                  text: 'ContentForge Post'
                }
              }]
            })
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': post.visibility
        }
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`LinkedIn API Error: ${errorData.message || response.statusText}`)
      }

      const data: LinkedInResponse = await response.json()
      
      return {
        success: true,
        postId: data.id
      }
    } catch (error) {
      console.error('LinkedIn publishing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`LinkedIn API Error: ${response.statusText}`)
      }

      const profile = await response.json()
      return {
        success: true,
        profile
      }
    } catch (error) {
      console.error('LinkedIn profile error:', error)
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
export const getLinkedInAuthUrl = (clientId: string, redirectUri: string, state: string) => {
  const scope = 'r_liteprofile r_emailaddress w_member_social'
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`
}

export const exchangeLinkedInCode = async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json()
    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}








