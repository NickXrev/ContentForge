'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDateTime, truncateText } from '@/lib/utils'

interface ActivityItem {
  id?: string
  team_id: string
  user_id: string
  activity_type: string
  activity_data: any
  created_at: string
}

export default function AdminActivityPage() {
  const { user, loading } = useAuth()
  const [vipId, setVipId] = useState<string | null>(null)
  const [events, setEvents] = useState<ActivityItem[]>([])
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) return
    // Basic guard: only allow the owner/admin to view; here we allow any signed-in for simplicity
    // You can tighten by checking user.email domain or role

    const fetchInitial = async () => {
      try {
        const { data: vipUser } = await supabase
          .from('users')
          .select('id')
          .eq('is_vip', true)
          .limit(1)
          .maybeSingle()
        const vip = vipUser?.id
        setVipId(vip || null)
        if (!vip) return
        const { data } = await supabase
          .from('user_activity')
          .select('team_id, user_id, activity_type, activity_data, created_at')
          .eq('user_id', vip)
          .order('created_at', { ascending: false })
          .limit(50)
        setEvents(data || [])
      } catch {}
    }
    fetchInitial()
  }, [user, loading])

  useEffect(() => {
    const setup = async () => {
      if (subscribed) return null
      const { data: vipUser } = await supabase
        .from('users')
        .select('id')
        .eq('is_vip', true)
        .limit(1)
        .maybeSingle()
      const vip = vipUser?.id
      if (!vip) return null

      const channel = supabase
        .channel(`vip-activity-${vip}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_activity', filter: `user_id=eq.${vip}` }, (payload: any) => {
          if (payload?.new) {
            setEvents(prev => [payload.new as ActivityItem, ...prev].slice(0, 100))
          }
        })
        .subscribe()

      setSubscribed(true)
      return channel
    }

    let chan: any
    setup().then(c => { chan = c })
    return () => {
      if (chan) {
        try { supabase.removeChannel(chan) } catch {}
        setSubscribed(false)
      }
    }
  }, [subscribed])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">VIP Activity</h1>
      <p className="text-sm text-gray-600 mb-6">Live feed for user: {vipId || '—'}</p>

      {events.length === 0 ? (
        <p className="text-gray-500">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">{e.activity_type}</div>
                <div className="text-xs text-gray-500">{formatDateTime(e.created_at)}</div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {truncateText(JSON.stringify(e.activity_data || {}), 300)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


