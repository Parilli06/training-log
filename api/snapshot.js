import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

// Collect a rich snapshot of recent data for the AI coach
export async function getSnapshot(date) {
  const d = new Date(date)
  const sevenDaysAgo = new Date(d)
  sevenDaysAgo.setDate(d.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const [sessions, food, supps, alcohol, settings, targets, schedule, context] = await Promise.all([
    supabase.from('sessions').select('*').gte('date', sevenDaysAgoStr).order('date', { ascending: false }),
    supabase.from('food_entries').select('*').gte('date', sevenDaysAgoStr).order('date', { ascending: false }),
    supabase.from('supps_entries').select('*').gte('date', sevenDaysAgoStr),
    supabase.from('alcohol_entries').select('*').gte('date', sevenDaysAgoStr),
    supabase.from('settings').select('*').limit(1).single(),
    supabase.from('nutrition_targets').select('*').limit(1).single(),
    supabase.from('weekly_schedule').select('*'),
    supabase.from('programme_context').select('context').limit(1).single(),
  ])

  return {
    sessions: sessions.data || [],
    food: food.data || [],
    supps: supps.data || [],
    alcohol: alcohol.data || [],
    settings: settings.data || {},
    targets: targets.data || {},
    schedule: schedule.data || [],
    programmeContext: context.data?.context || '',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { date } = req.query
  const snapshot = await getSnapshot(date || new Date().toISOString().split('T')[0])
  res.json(snapshot)
}
