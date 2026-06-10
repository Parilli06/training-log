export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { kind = 'morning-brief', date } = req.query
  const garminUrl = process.env.GARMIN_MCP_URL
  const garminToken = process.env.GARMIN_MCP_TOKEN

  if (!garminUrl || !garminToken) {
    return res.status(503).json({ error: 'Garmin connector not configured. Set GARMIN_MCP_URL and GARMIN_MCP_TOKEN in Vercel environment variables.' })
  }

  const today = date || new Date().toISOString().split('T')[0]

  try {
    let endpoint
    if (kind === 'morning-brief') {
      endpoint = `${garminUrl}/api/data/morning-brief?date=${today}&token=${garminToken}`
    } else if (kind === 'activities') {
      endpoint = `${garminUrl}/api/data/activities?date=${today}&token=${garminToken}`
    } else {
      return res.status(400).json({ error: 'Unknown kind: ' + kind })
    }

    const r = await fetch(endpoint)
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: text })
    }

    const data = await r.json()
    res.json(data)
  } catch (e) {
    console.error('Garmin proxy error:', e)
    res.status(500).json({ error: e.message })
  }
}
