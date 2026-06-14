import React, { useState, useEffect } from 'react'
import { supabase, today } from '../lib/supabase.js'

const STAT_CARDS = [
  { key: 'sleep_score', label: 'Sleep', unit: '/100', color: 'text-blue-400' },
  { key: 'hrv', label: 'HRV', unit: 'ms', color: 'text-green-400' },
  { key: 'body_battery', label: 'Battery', unit: '/100', color: 'text-brand' },
  { key: 'training_readiness', label: 'Readiness', unit: '/100', color: 'text-purple-400' },
]

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-surface rounded-2xl p-3 flex flex-col items-center justify-center gap-0.5">
      <span className={`text-2xl font-bold ${color}`}>
        {value !== null && value !== undefined ? value : '—'}
      </span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      {value !== null && value !== undefined && (
        <span className="text-[10px] text-gray-600">{unit}</span>
      )}
    </div>
  )
}

function MacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{current}<span className="text-gray-600">/{target}</span></span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function inlineMarkdown(text) {
  const parts = []
  const regex = /\*\*(.+?)\*\*|`(.+?)`/g
  let lastIdx = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    if (m[1] !== undefined) {
      parts.push(<strong key={m.index} className="text-white font-semibold">{m[1]}</strong>)
    } else {
      parts.push(<code key={m.index} className="bg-white/10 text-brand px-1 rounded text-xs font-mono">{m[2]}</code>)
    }
    lastIdx = regex.lastIndex
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return parts.length === 0 ? text : parts
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  const result = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      result.push(<h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{inlineMarkdown(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      result.push(<h2 key={i} className="text-base font-bold text-brand mt-4 mb-1">{inlineMarkdown(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      result.push(<h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">{inlineMarkdown(line.slice(2))}</h1>)
    } else if (line.trim() === '---') {
      result.push(<hr key={i} className="border-white/10 my-3" />)
    } else if (line.startsWith('> ')) {
      result.push(<div key={i} className="border-l-2 border-brand/50 pl-3 my-1.5 text-sm text-gray-300 italic">{inlineMarkdown(line.slice(2))}</div>)
    } else if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) { tableLines.push(lines[i]); i++ }
      const dataRows = tableLines.filter(r => !r.match(/^\|[\s\-|]+\|?$/))
      result.push(
        <div key={`t${i}`} className="my-2 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row.split('|').map(c => c.trim()).filter(c => c !== '')
                return (
                  <tr key={ri} className={ri === 0 ? 'border-b border-white/20' : 'border-b border-white/5'}>
                    {cells.map((cell, ci) => ri === 0
                      ? <th key={ci} className="py-1.5 pr-4 text-left text-white font-semibold text-xs">{inlineMarkdown(cell)}</th>
                      : <td key={ci} className="py-1.5 pr-4 text-gray-300 text-xs">{inlineMarkdown(cell)}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.startsWith('- ')) {
      result.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand mt-1 text-xs leading-none">•</span>
          <span className="text-sm text-gray-200">{inlineMarkdown(line.slice(2))}</span>
        </div>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1]
      result.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand mt-0.5 text-xs font-semibold min-w-[1.25rem]">{num}.</span>
          <span className="text-sm text-gray-200">{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      result.push(<div key={i} className="h-2" />)
    } else {
      result.push(<p key={i} className="text-sm text-gray-200 leading-relaxed">{inlineMarkdown(line)}</p>)
    }
    i++
  }
  return result
}

export default function Today() {
  const [garminData, setGarminData] = useState(null)
  const [garminLoading, setGarminLoading] = useState(true)
  const [garminError, setGarminError] = useState(null)
  const [yesterdayMacros, setYesterdayMacros] = useState(null)
  const [nutritionTargets, setNutritionTargets] = useState(null)
  const [keyLifts, setKeyLifts] = useState([])
  const [weeklySchedule, setWeeklySchedule] = useState(null)
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState(null)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const dateStr = today()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    const fetchGarmin = async () => {
      setGarminLoading(true)
      try {
        const res = await fetch(`/api/garmin-data?kind=morning-brief&date=${dateStr}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setGarminData(data)
      } catch (e) {
        try {
          const parsed = JSON.parse(e.message)
          setGarminError(parsed.error || 'Garmin not connected')
        } catch {
          setGarminError('Garmin not connected')
        }
      } finally {
        setGarminLoading(false)
      }
    }
    fetchGarmin()
  }, [dateStr])

  useEffect(() => {
    const load = async () => {
      const { data: food } = await supabase.from('food_entries').select('calories,protein,fat,carbs').eq('date', yesterday)
      if (food) {
        setYesterdayMacros(food.reduce((acc, e) => ({
          calories: acc.calories + (e.calories || 0),
          protein: acc.protein + (e.protein || 0),
          fat: acc.fat + (e.fat || 0),
          carbs: acc.carbs + (e.carbs || 0),
        }), { calories: 0, protein: 0, fat: 0, carbs: 0 }))
      }
      const { data: targets } = await supabase.from('nutrition_targets').select('*').limit(1).single()
      if (targets) setNutritionTargets(targets)
      const { data: settings } = await supabase.from('settings').select('key_lifts').limit(1).single()
      if (settings?.key_lifts) setKeyLifts(settings.key_lifts)
      const { data: schedule } = await supabase.from('weekly_schedule').select('*')
      if (schedule) {
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
        const todayName = dayNames[new Date().getDay()]
        setWeeklySchedule(schedule.find(s => s.day_of_week === todayName))
      }
    }
    load()
  }, [yesterday])

  const handlePlanSession = async () => {
    setPlanLoading(true)
    setPlanError(null)
    setPlan(null)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, garminData, notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setPlan(data.plan)
    } catch (e) {
      setPlanError(e.message)
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-bold mt-0.5">Good morning 👋</h1>
        {weeklySchedule && (
          <p className="text-sm text-gray-400 mt-1">
            Today: <span className="text-white font-medium">{weeklySchedule.display_name || weeklySchedule.workout_type}</span>
            {' · '}<span className="text-gray-500">{weeklySchedule.macro_bucket} macros</span>
          </p>
        )}
      </div>

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Last Night</h2>
        {garminLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {STAT_CARDS.map(s => <div key={s.key} className="bg-surface rounded-2xl p-3 h-20 animate-pulse" />)}
          </div>
        ) : garminError ? (
          <div className="bg-surface rounded-2xl p-4 text-sm">
            <span className="text-gray-500">Garmin unavailable</span>
            <span className="text-gray-600"> · Connect in Settings to see sleep &amp; readiness data</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {STAT_CARDS.map(s => <StatCard key={s.key} label={s.label} unit={s.unit} color={s.color} value={garminData?.[s.key]} />)}
          </div>
        )}
        {garminData?.training_status && (
          <p className="text-xs text-gray-500 mt-2">Training status: <span className="text-gray-300">{garminData.training_status}</span></p>
        )}
      </section>

      {yesterdayMacros && nutritionTargets && (
        <section className="bg-surface rounded-2xl p-4 space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Yesterday's Nutrition</h2>
          <MacroBar label="Calories" current={Math.round(yesterdayMacros.calories)} target={nutritionTargets.calories_lifting || 2500} color="bg-brand" />
          <MacroBar label="Protein" current={Math.round(yesterdayMacros.protein)} target={nutritionTargets.protein_lifting || 180} color="bg-blue-400" />
          <MacroBar label="Fat" current={Math.round(yesterdayMacros.fat)} target={nutritionTargets.fat_lifting || 80} color="bg-yellow-400" />
          <MacroBar label="Carbs" current={Math.round(yesterdayMacros.carbs)} target={nutritionTargets.carbs_lifting || 250} color="bg-green-400" />
        </section>
      )}

      {keyLifts.length > 0 && (
        <section className="bg-surface rounded-2xl p-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Key Lifts</h2>
          <div className="grid grid-cols-2 gap-2">
            {keyLifts.map((lift, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{lift.name}</span>
                <span className="text-sm font-semibold">{lift.target_kg}kg</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest">AI Session Plan</h2>
        {!plan && !planLoading && (
          <>
            <button onClick={() => setShowNotes(!showNotes)} className="text-xs text-gray-500 underline">
              {showNotes ? 'Hide notes' : '+ Add notes for today'}
            </button>
            {showNotes && (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. feeling tired, right shoulder tight, want to focus on…"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 resize-none h-20 focus:outline-none focus:border-brand/50"
              />
            )}
            <button onClick={handlePlanSession} className="w-full bg-brand text-black font-bold py-3 rounded-2xl text-sm tracking-wide hover:bg-brand/90 active:scale-95 transition-all">
              🧠 PLAN TODAY'S SESSION
            </button>
          </>
        )}
        {planLoading && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Claude is planning your session…</span>
          </div>
        )}
        {planError && <p className="text-sm text-red-400">{planError}</p>}
        {plan && (
          <div className="space-y-3">
            <div>{renderMarkdown(plan)}</div>
            <div className="flex gap-2 mt-4">
              <button onClick={handlePlanSession} className="flex-1 border border-white/20 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors">
                ↺ Revise
              </button>
              <button onClick={() => { setPlan(null); setNotes('') }} className="flex-1 border border-white/20 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors">
                Start fresh
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="h-4" />
    </div>
  )
}
