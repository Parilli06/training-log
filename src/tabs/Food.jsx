import React, { useState, useEffect, useRef } from 'react'
import { supabase, today } from '../lib/supabase.js'

const MACRO_COLORS = {
  calories: 'bg-brand',
  protein: 'bg-blue-400',
  fat: 'bg-yellow-400',
  carbs: 'bg-green-400',
}

function MacroRing({ label, current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const radius = 28
  const circ = 2 * Math.PI * radius
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={radius} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-white">{Math.round(current)}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-[10px] text-gray-700">/{target}</span>
    </div>
  )
}

const PRESET_MEALS = [
  { name: 'Protein shake', calories: 130, protein: 25, fat: 2, carbs: 5 },
  { name: 'Chicken breast 150g', calories: 248, protein: 46, fat: 5, carbs: 0 },
  { name: 'Rice 150g cooked', calories: 195, protein: 4, fat: 0, carbs: 44 },
  { name: 'Eggs x2', calories: 140, protein: 12, fat: 10, carbs: 1 },
  { name: 'Greek yoghurt 200g', calories: 130, protein: 20, fat: 1, carbs: 8 },
  { name: 'Oats 70g', calories: 265, protein: 9, fat: 5, carbs: 45 },
]

export default function Food() {
  const [entries, setEntries] = useState([])
  const [targets, setTargets] = useState({ calories: 2500, protein: 180, fat: 80, carbs: 250 })
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [showPresets, setShowPresets] = useState(false)
  const fileRef = useRef()
  const dateStr = today()

  useEffect(() => {
    loadEntries()
    loadTargets()
  }, [])

  const loadEntries = async () => {
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('date', dateStr)
      .order('created_at', { ascending: true })
    if (data) setEntries(data)
  }

  const loadTargets = async () => {
    const { data: schedule } = await supabase.from('weekly_schedule').select('*')
    const { data: t } = await supabase.from('nutrition_targets').select('*').limit(1).single()
    if (!t) return
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[new Date().getDay()]
    const todaySchedule = schedule?.find((s) => s.day_of_week === todayName)
    const bucket = todaySchedule?.macro_bucket || 'lifting'
    setTargets({
      calories: t[`calories_${bucket}`] || 2500,
      protein: t[`protein_${bucket}`] || 180,
      fat: t[`fat_${bucket}`] || 80,
      carbs: t[`carbs_${bucket}`] || 250,
    })
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      fat: acc.fat + (e.fat || 0),
      carbs: acc.carbs + (e.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const parseText = async () => {
    if (!input.trim()) return
    setParsing(true)
    setParseResult(null)
    try {
      const res = await fetch('/api/food-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      })
      const data = await res.json()
      setParseResult(data)
    } catch (e) {
      alert('Parse error: ' + e.message)
    } finally {
      setParsing(false)
    }
  }

  const parsePhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParsing(true)
    setParseResult(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'food')
      const res = await fetch('/api/food-parse', { method: 'POST', body: formData })
      const data = await res.json()
      setParseResult(data)
    } catch (e) {
      alert('Parse error: ' + e.message)
    } finally {
      setParsing(false)
    }
  }

  const addEntry = async (entry) => {
    const row = {
      id: crypto.randomUUID(),
      date: dateStr,
      name: entry.name || input || 'Food entry',
      calories: Math.round(entry.calories || 0),
      protein: Math.round(entry.protein || 0),
      fat: Math.round(entry.fat || 0),
      carbs: Math.round(entry.carbs || 0),
      created_at: new Date().toISOString(),
    }
    await supabase.from('food_entries').insert(row)
    setEntries([...entries, row])
    setInput('')
    setParseResult(null)
  }

  const addPreset = (preset) => addEntry(preset)

  const removeEntry = async (id) => {
    await supabase.from('food_entries').delete().eq('id', id)
    setEntries(entries.filter((e) => e.id !== id))
  }

  const ringValues = [
    { key: 'calories', label: 'kcal', color: '#e8ff3b' },
    { key: 'protein', label: 'protein', color: '#60a5fa' },
    { key: 'fat', label: 'fat', color: '#facc15' },
    { key: 'carbs', label: 'carbs', color: '#4ade80' },
  ]

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold">Food</h1>

      {/* Macro rings */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="flex justify-around">
          {ringValues.map(({ key, label, color }) => (
            <MacroRing key={key} label={label} current={totals[key]} target={targets[key]} color={color} />
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-3">
          {Math.round(targets.calories - totals.calories)} kcal remaining
        </p>
      </div>

      {/* Add food */}
      <div className="bg-surface rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest">Add Food</h2>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && parseText()}
            placeholder="e.g. 150g chicken breast and rice"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand/50"
          />
          <button
            onClick={parseText}
            disabled={parsing || !input.trim()}
            className="bg-brand text-black font-bold px-4 rounded-xl text-sm disabled:opacity-40"
          >
            {parsing ? '…' : 'Log'}
          </button>
        </div>

        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={parsePhoto} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="flex-1 border border-white/20 text-gray-400 py-2 rounded-xl text-xs hover:text-white hover:border-white/40 transition-colors"
          >
            📷 Photo
          </button>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex-1 border border-white/20 text-gray-400 py-2 rounded-xl text-xs hover:text-white hover:border-white/40 transition-colors"
          >
            ⚡ Presets
          </button>
        </div>

        {/* Parse result preview */}
        {parseResult && (
          <div className="bg-black/40 rounded-xl p-3 space-y-2">
            <p className="font-semibold text-sm">{parseResult.name}</p>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{parseResult.calories} kcal</span>
              <span>{parseResult.protein}g protein</span>
              <span>{parseResult.fat}g fat</span>
              <span>{parseResult.carbs}g carbs</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addEntry(parseResult)}
                className="flex-1 bg-brand text-black font-bold py-2 rounded-lg text-sm"
              >
                Add
              </button>
              <button
                onClick={() => setParseResult(null)}
                className="flex-1 border border-white/20 text-gray-400 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Presets */}
        {showPresets && (
          <div className="space-y-1">
            {PRESET_MEALS.map((p, i) => (
              <button
                key={i}
                onClick={() => { addPreset(p); setShowPresets(false) }}
                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-white/5 rounded-xl text-left transition-colors"
              >
                <span className="text-sm text-white">{p.name}</span>
                <span className="text-xs text-gray-500">{p.calories} kcal · {p.protein}g</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Today's entries */}
      {entries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Today</h2>
          {entries.map((e) => (
            <div key={e.id} className="bg-surface rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.calories} kcal · {e.protein}g P · {e.fat}g F · {e.carbs}g C
                </p>
              </div>
              <button
                onClick={() => removeEntry(e.id)}
                className="text-gray-600 hover:text-red-400 text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="h-4" />
    </div>
  )
}
