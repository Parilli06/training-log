export const config = { api: { bodyParser: false } }

async function callClaude({ system, messages, model = 'claude-haiku-4-5-20251001', maxTokens = 400 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const boundary = req.headers['content-type']?.split('boundary=')[1]
      if (!boundary) { resolve({}); return }
      const parts = body.toString('binary').split('--' + boundary)
      let imageData = null, imageType = null, type = 'food'
      for (const part of parts) {
        if (part.includes('name="image"')) {
          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd >= 0) {
            const header = part.substring(0, headerEnd)
            const contentTypeMatch = header.match(/Content-Type: ([^\r\n]+)/)
            imageType = contentTypeMatch?.[1]?.trim() || 'image/jpeg'
            imageData = Buffer.from(part.substring(headerEnd + 4, part.length - 2), 'binary')
          }
        }
        if (part.includes('name="type"')) {
          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd >= 0) type = part.substring(headerEnd + 4).trim()
        }
      }
      resolve({ imageData, imageType, type })
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    let text = null
    let imageBase64 = null
    let imageMediaType = 'image/jpeg'
    let parseType = 'food'

    const contentType = req.headers['content-type'] || ''

    if (contentType.includes('application/json')) {
      const body = await new Promise((resolve) => {
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
      })
      text = body.text
      parseType = body.type || 'food'
    } else if (contentType.includes('multipart/form-data')) {
      const { imageData, imageType, type } = await parseMultipart(req)
      imageBase64 = imageData?.toString('base64')
      imageMediaType = imageType || 'image/jpeg'
      parseType = type || 'food'
    }

    if (parseType === 'food') {
      const userContent = imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: 'Estimate the macros for this meal.' },
          ]
        : `Estimate the macros for: ${text}`

      const raw = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 300,
        system: 'You are a precise nutrition estimator. Always respond with ONLY a valid JSON object: {"name":"...", "calories": 0, "protein": 0, "fat": 0, "carbs": 0}. No other text. Round all numbers to integers.',
        messages: [{ role: 'user', content: userContent }],
      })

      let result
      try {
        result = JSON.parse(raw.trim())
      } catch {
        const match = raw.match(/\{[^}]+\}/)
        result = match ? JSON.parse(match[0]) : { name: text || 'Unknown', calories: 0, protein: 0, fat: 0, carbs: 0 }
      }
      res.json(result)

    } else if (parseType === 'workout') {
      const userContent = imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: 'Parse this workout into JSON.' },
          ]
        : `Parse this workout: ${text}`

      const raw = await callClaude({
        model: 'claude-sonnet-4-5',
        maxTokens: 1000,
        system: 'You are a gym session parser. Extract workouts into JSON: {"day_name": "...", "exercises": [{"name": "...", "sets": [{"setNum": 1, "weight": "", "reps": "5", "completed": false}]}]}. ONLY JSON, no other text.',
        messages: [{ role: 'user', content: userContent }],
      })

      let session
      try { session = JSON.parse(raw.trim()) } catch { session = null }
      res.json({ session })
    }
  } catch (e) {
    console.error('Food parse error:', e)
    res.status(500).json({ error: e.message })
  }
}
