import React, { useState, useEffect, useCallback } from 'react'
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
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
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

  // Load Garmin data
  useEffect(() => {
    const fetchGarmin = async () => {
      setGarminLoading(true)
      try {
        const res = await fetch(`/api/garmin-data?kind=morning-brief&date=${dateStr}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setGarminData(data)
      } catch (e) {
        setGarminError(e.message)
      } finally {
        setGarminLoading(false)
      }
    }
    fetchGarmin()
  }, [dateStr])

  // Load yesterday's food + targets
  useEffect(() => {
    const load = async () => {
      const { data: food } = await supabase
        .from('food_entries')
        .select('calories,protein,fat,carbs')
        .eq('date', yesterday)

      if (food) {
        setYesterdayMacros(
          food.reduce(
            (acc, e) => ({
              calories: acc.calories + (e.calories || 0),
              protein: acc.protein + (e.protein || 0),
              fat: acc.fat + (e.fat || 0),
              carbs: acc.carbs + (e.carbs || 0),
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
          )
        )
      }

      const { data: targets } = await supabase
        .from('nutrition_targets')
        .select('*')
        .limit(1)
        .single()
      if (targets) setNutritionTargets(targets)

      const { data: settings } = await supabase
        .from('settings')
        .select('key_lifts')
        .limit(1)
        .single()
      if (settings?.key_lifts) setKeyLifts(settings.key_lifts)

      const { data: schedule } = await supabase
        .from('weekly_schedule')
        .select('*')
      if (schedule) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const todayName = dayNames[new Date().getDay()]
        const todayEntry = schedule.find((s) => s.day_of_week === todayName)
        setWeeklySchedule(todayEntry)
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

  const todayDayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' })

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-bold mt-0.5">Good morning 👋</h1>
        {weeklySchedule && (
          <p className="text-sm text-gray-400 mt-1">
            Today: <span className="text-white font-medium">{weeklySchedule.display_name || weeklySchedule.workout_type}</span>
            {' · '}
            <span className="text-gray-500">{weeklySchedule.macro_bucket} macros</span>
          </p>
        )}
      </div>

      {/* Garmin Stats */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Last Night</h2>
        {garminLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {STAT_CARDS.map((s) => (
              <div key={s.key} className="bg-surface rounded-2xl p-3 h-20 animate-pulse" />
            ))}
          </div>
        ) : garminError ? (
          <div className="bg-surface rounded-2xl p-4 text-sm text-red-400">
            Garmin unavailable · <span className="text-gray-500">{garminError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {STAT_CARDS.map((s) => (
              <StatCard
                key={s.key}
                label={s.label}
                unit={s.unit}
                color={s.color}
                value={garminData?.[s.key]}
              />
            ))}
          </div>
        )}
        {garminData?.training_status && (
          <p className="text-xs text-gray-500 mt-2">
            Training status: <span className="text-gray-300">{garminData.training_status}</span>
          </p>
        )}
      </section>

      {/* Yesterday's Macros */}
      {yesterdayMacros && nutritionTargets && (
        <section className="bg-surface rounded-2xl p-4 space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Yesterday's Nutrition</h2>
          <MacroBar label="Calories" current={Math.round(yesterdayMacros.calories)} target={nutritionTargets.calories_lifting || 2500} color="bg-brand" />
          <MacroBar label="Protein" current={Math.round(yesterdayMacros.protein)} target={nutritionTargets.protein_lifting || 180} color="bg-blue-400" />
          <MacroBar label="Fat" current={Math.round(yesterdayMacros.fat)} target={nutritionTargets.fat_lifting || 80} color="bg-yellow-400" />
          <MacroBar label="Carbs" current={Math.round(yesterdayMacros.carbs)} target={nutritionTargets.carbs_lifting || 250} color="bg-green-400" />
        </section>
      )}

      {/* Key Lifts */}
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

      {/* Plan Session */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest">AI Session Plan</h2>

        {!plan && !planLoading && (
          <>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-xs text-gray-500 underline"
            >
              {showNotes ? 'Hide notes' : '+ Add notes for today'}
            </button>
            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. feeling tired, right shoulder tight, want to focus on…"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 resize-none h-20 focus:outline-none focus:border-brand/50"
              />
            )}
            <button
              onClick={handlePlanSession}
              className="w-full bg-brand text-black font-bold py-3 rounded-2xl text-sm tracking-wide hover:bg-brand/90 active:scale-95 transition-all"
            >
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

        {planError && (
          <p className="text-sm text-red-400">{planError}</p>
        )}

        {plan && (
          <div className="space-y-3">
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed">{plan}</pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePlanSession}
                className="flex-1 border border-white/20 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors"
              >
                ↺ Revise
              </button>
              <button
                onClick={() => { setPlan(null); setNotes('') }}
                className="flex-1 border border-white/20 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors"
              >
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
