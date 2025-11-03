import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'
import { openRouter } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { teamId, limit = 50 } = await request.json()
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    // Fetch recent content for the team
    const { data: docs, error: docsError } = await supabase
      .from('content_documents')
      .select('id, title, content, platform, metadata, created_at, updated_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(Math.max(10, Math.min(100, limit)))

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch content', details: docsError.message }, { status: 500 })
    }

    const texts = (docs || [])
      .map(d => [d.title, d.content].filter(Boolean).join('\n'))
      .filter(t => t && t.trim().length > 0)

    if (texts.length === 0) {
      return NextResponse.json({ error: 'No content available to analyze' }, { status: 400 })
    }

    // Lightweight metrics for non-LLM features
    const sample = texts.slice(0, 30).join('\n\n').slice(0, 20000)
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
    const hashtagRegex = /(^|\s)#\w+/g
    const exclamRegex = /!/g
    const sentenceCount = sample.split(/[.!?]+\s/).filter(Boolean).length || 1
    const wordCount = sample.split(/\s+/).filter(Boolean).length || 1
    const avgSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10
    const emojiCount = (sample.match(emojiRegex) || []).length
    const hashtagCount = (sample.match(hashtagRegex) || []).length
    const exclamCount = (sample.match(exclamRegex) || []).length

    // Ask LLM to summarize observed voice
    const system = `You are a marketing editor. Given excerpts of a team's past content, infer a concise, practical brand voice guide. Output strictly JSON with fields: summary (string), tone_adjectives (string[]), style_notes (string[]), platform_variations (object with twitter/linkedin/instagram keys, each array of strings), do (string[]), dont (string[]). Keep it short and actionable.`
    const user = `Here are excerpts from past content (truncated):\n\n${sample}\n\nObserved metrics: avgSentenceLength=${avgSentenceLength}, emojiCount=${emojiCount}, hashtagCount=${hashtagCount}, exclamationCount=${exclamCount}.`

    const completion = await openRouter.generateContent({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.4,
      max_tokens: 800
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let derived: any
    try {
      derived = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch (e) {
      derived = { summary: 'Professional', tone_adjectives: [], style_notes: [], platform_variations: {}, do: [], dont: [] }
    }

    const payload = {
      summary: String(derived.summary || '').slice(0, 500),
      tone_adjectives: Array.isArray(derived.tone_adjectives) ? derived.tone_adjectives.slice(0, 10) : [],
      style_notes: Array.isArray(derived.style_notes) ? derived.style_notes.slice(0, 10) : [],
      platform_variations: typeof derived.platform_variations === 'object' && derived.platform_variations ? derived.platform_variations : {},
      metrics: { avgSentenceLength, emojiCount, hashtagCount, exclamCount }
    }

    // Upsert into client_profiles (most recent profile for team)
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!profile?.id) {
      // Create minimal profile with derived voice
      await supabase.from('client_profiles').insert({ team_id: teamId, brand_voice: 'professional', derived_brand_voice: payload })
    } else {
      await supabase.from('client_profiles').update({ derived_brand_voice: payload }).eq('id', profile.id)
    }

    return NextResponse.json({ ok: true, derived: payload })
  } catch (error) {
    console.error('derive-voice error:', error)
    return NextResponse.json({ error: 'Failed to derive brand voice' }, { status: 500 })
  }
}


