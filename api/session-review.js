import { getSnapshot } from './snapshot.js'

async function callClaude(prompt, maxTokens = 600) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { session, date } = req.body
  const today = date || new Date().toISOString().split('T')[0]

  try {
    const snap = await getSnapshot(today)

    // Fetch Garmin activity data for this session's date
    let garminActivities = null
    if (process.env.GARMIN_MCP_URL && process.env.GARMIN_MCP_TOKEN) {
      try {
        const r = await fetch(
          `${process.env.GARMIN_MCP_URL}/api/data/activities?date=${session.date || today}&token=${process.env.GARMIN_MCP_TOKEN}`
        )
        if (r.ok) garminActivities = await r.json()
      } catch (e) {
        console.warn('Could not fetch Garmin activities:', e.message)
      }
    }

    const exerciseSummary = session.exercises?.map((ex) => {
      const sets = ex.sets?.filter((s) => s.weight || s.reps)
        .map((s) => `${s.weight || '?'}kg×${s.reps || '?'}`)
        .join(', ')
      return `${ex.name}: ${sets || 'no data'} | RPE ${ex.rpe || '?'}`
    }).join('\n') || 'No exercises recorded'

    const prompt = `You are an expert strength coach reviewing a completed training session. Give a direct, useful post-session review.

## Programme Context
${snap.programmeContext || 'No programme context available.'}

## Completed Session
Date: ${session.date || today}
Type: ${session.day_name || 'Unknown'}
Session RPE: ${session.rpe || 'Not recorded'}
Notes: ${session.notes || 'None'}

Exercises:
${exerciseSummary}

## Key Lift Targets
${snap.settings?.key_lifts?.map((l) => `${l.name}: ${l.target_kg}kg`).join('\n') || 'Not set'}

${garminActivities ? `## Garmin Activity Data
${JSON.stringify(garminActivities, null, 2)}` : ''}

---

Write a concise session review (200-300 words) covering:
1. Volume/intensity assessment vs targets
2. What went well
3. One or two specific things to focus on next session
4. Any concerns or notes on recovery

Be direct and coach-like. Reference specific numbers from the log. If Garmin data is available, use it (heart rate zones, calorie burn, etc.).`

    const review = await callClaude(prompt, 600)

    // Save review to DB
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    )
    await supabase.from('session_reviews').upsert({
      session_id: session.id,
      date: session.date || today,
      review,
      created_at: new Date().toISOString(),
    })

    res.json({ review })
  } catch (e) {
    console.error('Session review error:', e)
    res.status(500).json({ error: e.message })
  }
}
