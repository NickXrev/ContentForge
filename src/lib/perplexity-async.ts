// Async Perplexity research service
export const perplexityAsyncResearch = {
  async startResearchJob(companyName: string, website?: string) {
    const apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
    
    if (!apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    console.log('🚀 Starting async Perplexity research job...')
    console.log('Company:', companyName)

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: `Research the company "${companyName}" and provide comprehensive information about their industry, business model, target audience, key services, competitors, recent news, market trends, and SEO keywords. Format your response with clear sections for each topic.`
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to start async job: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Async job started:', data)
      
      return {
        jobId: data.id,
        status: data.status,
        createdAt: data.created_at,
        model: data.model
      }
    } catch (error) {
      console.error('Failed to start async research job:', error)
      throw error
    }
  },

  async checkJobStatus(jobId: string) {
    const apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
    
    try {
      const response = await fetch(`https://api.perplexity.ai/async/chat/completions/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Job status:', data.status)
      
      return {
        status: data.status,
        response: data.response,
        errorMessage: data.error_message,
        completedAt: data.completed_at,
        startedAt: data.started_at,
        failedAt: data.failed_at
      }
    } catch (error) {
      console.error('Failed to check job status:', error)
      throw error
    }
  },

  async pollForCompletion(jobId: string, onProgress?: (status: string) => void) {
    console.log('🔄 Polling for job completion...')
    
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.checkJobStatus(jobId)
          
          if (onProgress) {
            onProgress(status.status)
          }
          
          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval)
            console.log('✅ Job completed!')
            resolve(status.response)
          } else if (status.status === 'FAILED') {
            clearInterval(pollInterval)
            console.error('❌ Job failed:', status.errorMessage)
            reject(new Error(`Job failed: ${status.errorMessage}`))
          }
          // If still processing, continue polling
        } catch (error) {
          clearInterval(pollInterval)
          reject(error)
        }
      }, 30000) // Poll every 30 seconds
    })
  },

  async researchCompany(companyName: string, website?: string, teamId?: string, clientProfileId?: string) {
    console.log('🔍 Starting async research for:', companyName)
    
    // Start the async job
    const job = await this.startResearchJob(companyName, website)
    console.log('📋 Job started with ID:', job.jobId)
    
    // Save job ID immediately to database if team info provided
    if (teamId && clientProfileId) {
      const { supabase } = await import('@/lib/supabase')
      await supabase
        .from('research_data')
        .upsert({
          team_id: teamId,
          client_profile_id: clientProfileId,
          research_type: 'perplexity',
          research_data: {
            jobId: job.jobId,
            jobStatus: 'processing',
            startedAt: new Date().toISOString(),
            companyName,
            website
          }
        })
      console.log('💾 Job ID saved to database immediately')
    }
    
    // Poll for completion
    const result = await this.pollForCompletion(job.jobId, (status) => {
      console.log('📊 Job status update:', status)
    })
    
    console.log('🎉 Research completed!')
    
    // Extract and structure the data
    const content = result || ''
    
    return {
      jobId: job.jobId,
      industry: this.extractField(content, ['Industry Overview', 'industry', 'sector']) || 'Technology',
      businessType: this.extractField(content, ['Business Model', 'business model', 'revenue model']) || 'B2B',
      companySize: this.extractField(content, ['company size', 'size', 'employees']) || 'Small Business',
      targetAudience: this.extractField(content, ['Target Audience', 'target audience', 'customer segmentation']) || 'Business professionals',
      keyServices: this.extractArray(content, ['Key Services', 'services', 'products', 'offerings']),
      competitors: this.extractArray(content, ['Competitive Landscape', 'competitors', 'rivals']),
      seoKeywords: this.extractArray(content, ['SEO', 'keywords', 'SEO terms', 'search terms']),
      recentNews: this.extractArray(content, ['Recent Developments', 'recent news', 'latest updates']),
      marketTrends: this.extractArray(content, ['Market Trends', 'trends', 'market developments']),
      uniqueValueProp: this.extractField(content, ['unique value proposition', 'differentiator', 'positioning']) || 'Quality service and customer focus',
      brandTone: this.extractField(content, ['tone', 'voice', 'style']) || 'Professional',
      contentGoals: this.extractArray(content, ['content goals', 'marketing objectives']),
      audiencePainPoints: this.extractArray(content, ['challenges', 'pain points', 'problems']),
      audienceGoals: this.extractArray(content, ['goals', 'objectives']),
      socialMediaPresence: {
        platforms: this.extractArray(content, ['social media', 'platforms', 'LinkedIn']),
        engagement: 'Medium',
        followers: 'Growing'
      },
      websiteAnalysis: {
        domain: website || 'Not provided',
        description: 'Professional business website',
        keyFeatures: ['Responsive design', 'Contact forms', 'Service information']
      },
      // Add comprehensive report data
      fullReport: content,
      reportSections: this.extractReportSections(content),
      citations: this.extractCitations(content)
    }
  },

  extractField(text: any, patterns: string[]): string {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text)
    
    // Try to extract from structured sections first
    for (const pattern of patterns) {
      // Look for section headers like "## Target Audience" or "## Business Model"
      const sectionRegex = new RegExp(`##\\s*${pattern}[^#]*(?=##|$)`, 'gis')
      const sectionMatch = textStr.match(sectionRegex)
      if (sectionMatch) {
        const section = sectionMatch[0]
        // Extract first meaningful sentence from the section
        const sentenceRegex = /[.!?]\s*([A-Z][^.!?]{20,200}[.!?])/g
        const sentences = section.match(sentenceRegex)
        if (sentences && sentences.length > 0) {
          return sentences[0].trim()
        }
      }
      
      // Fallback to original regex for simple patterns
      const regex = new RegExp(`(?:${pattern})[:\s]+([^.]+)`, 'i')
      const match = textStr.match(regex)
      if (match) return match[1].trim()
    }
    return ''
  },

  extractArray(text: any, patterns: string[]): string[] {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text)
    const results: string[] = []
    
    for (const pattern of patterns) {
      // Look for bullet points or lists in sections
      const sectionRegex = new RegExp(`##\\s*${pattern}[^#]*(?=##|$)`, 'gis')
      const sectionMatch = textStr.match(sectionRegex)
      if (sectionMatch) {
        const section = sectionMatch[0]
        // Extract bullet points or numbered lists
        const listRegex = /[-*•]\s*([^\n]+)/g
        const listMatches = section.match(listRegex)
        if (listMatches) {
          results.push(...listMatches.map(m => m.replace(/^[-*•]\s*/, '').trim()))
        }
        
        // Extract sentences that might contain lists
        const sentenceRegex = /[.!?]\s*([A-Z][^.!?]{10,150}[.!?])/g
        const sentences = section.match(sentenceRegex)
        if (sentences) {
          results.push(...sentences.map(s => s.trim()))
        }
      }
      
      // Fallback to original regex
      const regex = new RegExp(`(?:${pattern})[:\s]+([^.]+)`, 'gi')
      const matches = textStr.match(regex)
      if (matches) {
        results.push(...matches.map(m => m.replace(new RegExp(`^(?:${pattern})[:\s]+`, 'i'), '').trim()))
      }
    }
    return [...new Set(results)].slice(0, 8)
  },

  extractReportSections(text: any): any {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text)
    const sections: any = {}
    
    // Extract all ## sections
    const sectionRegex = /##\s*([^#\n]+)\n([^#]*(?=##|$))/gs
    const matches = textStr.match(sectionRegex)
    
    if (matches) {
      matches.forEach(match => {
        const lines = match.split('\n')
        const title = lines[0].replace(/^##\s*/, '').trim()
        const content = lines.slice(1).join('\n').trim()
        if (title && content) {
          sections[title] = content
        }
      })
    }
    
    return sections
  },

  extractCitations(text: any): string[] {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text)
    const citations: string[] = []
    
    // Extract citation references like [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g
    const matches = textStr.match(citationRegex)
    
    if (matches) {
      citations.push(...matches)
    }
    
    return [...new Set(citations)]
  }
}
