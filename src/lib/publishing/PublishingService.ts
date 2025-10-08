'use client'

import { LinkedInConnector } from '../social-platforms/linkedin'
import { TwitterConnector } from '../social-platforms/twitter'
import { InstagramConnector } from '../social-platforms/instagram'

export interface SocialAccount {
  id: string
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook'
  accountId: string
  accountName: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  isActive: boolean
  metadata?: Record<string, any>
}

export interface PublishRequest {
  contentId: string
  platform: string
  accountId: string
  content: {
    text: string
    media?: {
      type: 'image' | 'video'
      url: string
    }
  }
  scheduledAt?: Date
  metadata?: Record<string, any>
}

export interface PublishResult {
  success: boolean
  postId?: string
  platform?: string
  publishedAt?: Date
  error?: string
  retryCount?: number
}

export class PublishingService {
  private accounts: Map<string, SocialAccount> = new Map()

  constructor(accounts: SocialAccount[] = []) {
    accounts.forEach(account => {
      this.accounts.set(account.id, account)
    })
  }

  addAccount(account: SocialAccount): void {
    this.accounts.set(account.id, account)
  }

  removeAccount(accountId: string): void {
    this.accounts.delete(accountId)
  }

  getAccounts(): SocialAccount[] {
    return Array.from(this.accounts.values())
  }

  getAccount(accountId: string): SocialAccount | undefined {
    return this.accounts.get(accountId)
  }

  async publishPost(request: PublishRequest): Promise<PublishResult> {
    const account = this.accounts.get(request.accountId)
    
    if (!account) {
      return {
        success: false,
        error: 'Account not found'
      }
    }

    if (!account.isActive) {
      return {
        success: false,
        error: 'Account is not active'
      }
    }

    try {
      let result: PublishResult

      switch (account.platform) {
        case 'linkedin':
          result = await this.publishToLinkedIn(account, request)
          break
        case 'twitter':
          result = await this.publishToTwitter(account, request)
          break
        case 'instagram':
          result = await this.publishToInstagram(account, request)
          break
        case 'facebook':
          result = await this.publishToFacebook(account, request)
          break
        default:
          return {
            success: false,
            error: `Unsupported platform: ${account.platform}`
          }
      }

      return {
        ...result,
        platform: account.platform,
        publishedAt: new Date()
      }
    } catch (error) {
      console.error('Publishing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async publishToLinkedIn(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    const connector = new LinkedInConnector(
      account.accessToken,
      account.metadata?.personUrn || ''
    )

    const result = await connector.publishPost({
      text: request.content.text,
      media: request.content.media,
      visibility: 'PUBLIC'
    })

    return {
      success: result.success,
      postId: result.postId,
      error: result.error
    }
  }

  private async publishToTwitter(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    const connector = new TwitterConnector(
      account.accessToken,
      account.metadata?.accessTokenSecret || '',
      account.metadata?.apiKey || '',
      account.metadata?.apiSecret || ''
    )

    const result = await connector.publishPost({
      text: request.content.text,
      media: request.content.media
    })

    return {
      success: result.success,
      postId: result.postId,
      error: result.error
    }
  }

  private async publishToInstagram(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    const connector = new InstagramConnector(
      account.accessToken,
      account.metadata?.userId || account.accountId
    )

    if (!request.content.media) {
      return {
        success: false,
        error: 'Instagram requires media (image or video)'
      }
    }

    const result = await connector.publishPost({
      text: request.content.text,
      media: request.content.media,
      mediaType: 'FEED'
    })

    return {
      success: result.success,
      postId: result.postId,
      error: result.error
    }
  }

  private async publishToFacebook(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    // Facebook implementation would go here
    // For now, return a placeholder
    return {
      success: false,
      error: 'Facebook publishing not implemented yet'
    }
  }

  async validateAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account) return false

    try {
      switch (account.platform) {
        case 'linkedin':
          const linkedinConnector = new LinkedInConnector(
            account.accessToken,
            account.metadata?.personUrn || ''
          )
          return await linkedinConnector.validateToken()
        
        case 'twitter':
          const twitterConnector = new TwitterConnector(
            account.accessToken,
            account.metadata?.accessTokenSecret || '',
            account.metadata?.apiKey || '',
            account.metadata?.apiSecret || ''
          )
          return await twitterConnector.validateToken()
        
        case 'instagram':
          const instagramConnector = new InstagramConnector(
            account.accessToken,
            account.metadata?.userId || account.accountId
          )
          return await instagramConnector.validateToken()
        
        default:
          return false
      }
    } catch {
      return false
    }
  }

  async refreshAccountToken(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account || !account.refreshToken) return false

    try {
      // Implement token refresh logic for each platform
      // This would involve calling the platform's refresh endpoint
      console.log('Refreshing token for account:', accountId)
      return true
    } catch {
      return false
    }
  }
}








