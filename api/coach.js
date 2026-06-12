// Coach API v3
import { getSnapshot } from './snapshot.js'

async function callClaude(messages, maxTokens = 1500) {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages,
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { date, garminData, notes } = req.body
  const today = date || new Date().toISOString().split('T')[0]

  try {
    const snap = await getSnapshot(today)

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[new Date(today + 'T12:00:00').getDay()]
    const todaySchedule = snap.schedule.find((s) => s.day_of_week === todayName)

    // Format recent sessions for context
    const recentSessions = snap.sessions.slice(0, 5).map((s) => {
      const exSummary = s.exercises?.slice(0, 4).map((ex) => {
        const topSet = ex.sets?.reduce((best, set) => {
          const w = parseFloat(set.weight) || 0
          return w > (parseFloat(best.weight) || 0) ? set : best
        }, ex.sets?.[0] || {})
        return `${ex.name}: ${ex.sets?.length || 0} sets, top set ${topSet?.weight || '?'}kg×${topSet?.reps || '?'}`
      }).join('; ')
      return `${s.date} (${s.day_name}, RPE ${s.rpe || '?'}): ${exSummary}`
    }).join('\n')

    // Format recent food
    const foodByDay = {}
    snap.food.forEach((f) => {
      if (!foodByDay[f.date]) foodByDay[f.date] = { calories: 0, protein: 0 }
      foodByDay[f.date].calories += f.calories || 0
      foodByDay[f.date].protein += f.protein || 0
    })
    const recentFood = Object.entries(foodByDay).slice(0, 5)
      .map(([d, m]) => `${d}: ${Math.round(m.calories)} kcal, ${Math.round(m.protein)}g protein`)
      .join('\n')

    const prompt = `You are an expert strength and conditioning coach. Plan today's training session based on all available context.

## Programme Context
${snap.programmeContext || 'No programme context set. Please advise the user to fill this in at Settings > AI Context.'}

## Today
Date: ${today}
Day: ${todaySchedule?.display_name || todayName}
Workout type: ${todaySchedule?.workout_type || 'not specified'}
Macro bucket: ${todaySchedule?.macro_bucket || 'lifting'}

## Garmin Data (Last Night)
${garminData ? `Sleep score: ${garminData.sleep_score || 'N/A'}/100
HRV: ${garminData.hrv || 'N/A'} ms
Body Battery: ${garminData.body_battery || 'N/A'}/100
Training Readiness: ${garminData.training_readiness || 'N/A'}/100
Training Status: ${garminData.training_status || 'N/A'}` : 'Garmin data not available'}

## Recent Training (last 5 sessions)
${recentSessions || 'No sessions logged yet.'}

## Recent Nutrition (last 5 days)
${recentFood || 'No nutrition data.'}

## Key Lifts & Targets
${snap.settings?.key_lifts?.map((l) => `${l.name}: ${l.target_kg}kg target`).join('\n') || 'Not set'}

## Athlete Notes for Today
${notes || 'None'}

---

Write a specific, actionable training session plan for today. Include:
1. A brief 2-3 sentence assessment of readiness and what that means for today
2. Warm-up (specific, 5-10 minutes)
3. Main session with exact sets, reps, and weights (as % of target or absolute kg where you can infer)
4. Cool-down / mobility notes if relevant
5. One sentence coaching cue to focus on

Be direct and specific. Use the programme context to tailor exercises to this athlete's level and goals. If readiness is low (HRV or body battery), adjust volume/intensity accordingly and explain why.`

    const plan = await callClaude([{ role: 'user', content: prompt }], 1500)
    res.json({ plan })
  } catch (e) {
    console.error('Coach error:', e)
    res.status(500).json({ error: e.message })
  }
}
