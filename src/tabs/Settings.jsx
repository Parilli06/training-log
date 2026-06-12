import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const WORKOUT_TYPES = [
  { value: 'upper_push', label: 'Upper Push' },
  { value: 'upper_pull', label: 'Upper Pull' },
  { value: 'lower_squat', label: 'Lower (Squat)' },
  { value: 'olympic', label: 'Olympic' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'rest', label: 'Rest / Mobility' },
  { value: 'custom', label: 'Custom' },
]

const MACRO_BUCKETS = [
  { value: 'rest', label: 'Rest' },
  { value: 'lifting', label: 'Lifting' },
  { value: 'big', label: 'Big Training' },
]

const DEFAULT_SCHEDULE = DAY_NAMES.map((day, i) => ({
  day_of_week: day,
  display_name: DAY_LABELS[i],
  workout_type: i < 5 ? 'upper_push' : 'rest',
  macro_bucket: i < 5 ? 'lifting' : 'rest',
}))

const DEFAULT_TARGETS = {
  calories_rest: 2000, protein_rest: 160, fat_rest: 70, carbs_rest: 150,
  calories_lifting: 2500, protein_lifting: 180, fat_lifting: 80, carbs_lifting: 250,
  calories_big: 3000, protein_big: 200, fat_big: 90, carbs_big: 350,
}

const DEFAULT_LIFTS = [
  { name: 'Bench Press', target_kg: 100 },
  { name: 'Squat', target_kg: 140 },
  { name: 'Deadlift', target_kg: 180 },
  { name: 'Overhead Press', target_kg: 70 },
  { name: 'Snatch', target_kg: 80 },
  { name: 'Clean & Jerk', target_kg: 100 },
]

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
      />
    </div>
  )
}

export default function Settings() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [targets, setTargets] = useState(DEFAULT_TARGETS)
  const [lifts, setLifts] = useState(DEFAULT_LIFTS)
  const [weeklyAlcohol, setWeeklyAlcohol] = useState('14')
  const [programmeContext, setProgrammeContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('programme')

  useEffect(() => {
    const load = async () => {
      // Load weekly schedule
      const { data: schedData } = await supabase.from('weekly_schedule').select('*')
      if (schedData && schedData.length > 0) {
        const sorted = DAY_NAMES.map((day) => {
          const found = schedData.find((s) => s.day_of_week === day)
          return found || DEFAULT_SCHEDULE.find((d) => d.day_of_week === day)
        })
        setSchedule(sorted)
      }

      // Load nutrition targets
      const { data: t } = await supabase.from('nutrition_targets').select('*').limit(1).single()
      if (t) setTargets(t)

      // Load settings (key lifts, alcohol)
      const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
      if (settings) {
        if (settings.key_lifts) setLifts(settings.key_lifts)
        if (settings.weekly_alcohol_limit) setWeeklyAlcohol(String(settings.weekly_alcohol_limit))
      }

      // Load programme context
      const { data: ctx } = await supabase.from('programme_context').select('context').limit(1).single()
      if (ctx?.context) setProgrammeContext(ctx.context)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save schedule
      for (const day of schedule) {
        const { error } = await supabase.from('weekly_schedule').upsert({
          day_of_week: day.day_of_week,
          display_name: day.display_name,
          workout_type: day.workout_type,
          macro_bucket: day.macro_bucket,
        }, { onConflict: 'day_of_week' })
        if (error) throw new Error('Schedule: ' + error.message)
      }

      // Save nutrition targets
      const { error: targetsError } = await supabase.from('nutrition_targets').upsert({
        id: 1,
        ...targets,
        updated_at: new Date().toISOString(),
      })
      if (targetsError) throw new Error('Targets: ' + targetsError.message)

      // Save settings
      const { error: settingsError } = await supabase.from('settings').upsert({
        id: 1,
        key_lifts: lifts,
        weekly_alcohol_limit: parseFloat(weeklyAlcohol) || 14,
        updated_at: new Date().toISOString(),
      })
      if (settingsError) throw new Error('Settings: ' + settingsError.message)

      // Save programme context
      const { error: ctxError } = await supabase.from('programme_context').upsert({
        id: 1,
        context: programmeContext,
        updated_at: new Date().toISOString(),
      })
      if (ctxError) throw new Error('Context: ' + ctxError.message)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (dayIndex, field, value) => {
    const next = [...schedule]
    next[dayIndex] = { ...next[dayIndex], [field]: value }
    setSchedule(next)
  }

  const updateLift = (idx, field, value) => {
    const next = [...lifts]
    next[idx] = { ...next[idx], [field]: field === 'target_kg' ? parseFloat(value) : value }
    setLifts(next)
  }

  const sections = [
    { key: 'programme', label: 'Programme' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'lifts', label: 'Key Lifts' },
    { key: 'context', label: 'AI Context' },
  ]

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-brand text-black'
          } disabled:opacity-50`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-surface rounded-2xl p-1">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeSection === s.key ? 'bg-brand text-black' : 'text-gray-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Programme */}
      {activeSection === 'programme' && (
        <section className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Weekly Programme</h2>
          {schedule.map((day, idx) => (
            <div key={day.day_of_week} className="bg-surface rounded-2xl p-4 space-y-3">
              <p className="font-semibold text-sm">{DAY_LABELS[idx]}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Display name</label>
                  <input
                    value={day.display_name}
                    onChange={(e) => updateDay(idx, 'display_name', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Macro bucket</label>
                  <select
                    value={day.macro_bucket}
                    onChange={(e) => updateDay(idx, 'macro_bucket', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50 appearance-none"
                  >
                    {MACRO_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Workout type</label>
                <select
                  value={day.workout_type}
                  onChange={(e) => updateDay(idx, 'workout_type', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50 appearance-none"
                >
                  {WORKOUT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          ))}

          <div className="bg-surface rounded-2xl p-4">
            <Input
              label="Weekly alcohol limit (UK units)"
              value={weeklyAlcohol}
              onChange={setWeeklyAlcohol}
              type="number"
              placeholder="14"
            />
          </div>
        </section>
      )}

      {/* Nutrition targets */}
      {activeSection === 'nutrition' && (
        <section className="space-y-3">
          {['rest', 'lifting', 'big'].map((bucket) => {
            const labels = { rest: 'Rest days', lifting: 'Lifting days', big: 'Big training days' }
            return (
              <div key={bucket} className="bg-surface rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">{labels[bucket]}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['calories', 'protein', 'fat', 'carbs'].map((macro) => (
                    <div key={macro}>
                      <label className="text-xs text-gray-500 capitalize mb-1 block">{macro}</label>
                      <input
                        type="number"
                        value={targets[`${macro}_${bucket}`] || ''}
                        onChange={(e) => setTargets({ ...targets, [`${macro}_${bucket}`]: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Key lifts */}
      {activeSection === 'lifts' && (
        <section className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Key Lift Targets</h2>
          {lifts.map((lift, idx) => (
            <div key={idx} className="bg-surface rounded-2xl p-4">
              <div className="flex gap-3 items-center">
                <input
                  value={lift.name}
                  onChange={(e) => updateLift(idx, 'name', e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                  placeholder="Exercise name"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={lift.target_kg}
                    onChange={(e) => updateLift(idx, 'target_kg', e.target.value)}
                    className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-brand/50"
                    placeholder="kg"
                  />
                  <span className="text-xs text-gray-500">kg</span>
                </div>
                <button
                  onClick={() => setLifts(lifts.filter((_, i) => i !== idx))}
                  className="text-gray-600 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setLifts([...lifts, { name: '', target_kg: 0 }])}
            className="w-full border border-dashed border-white/20 rounded-2xl py-3 text-sm text-gray-500 hover:border-white/40 hover:text-white transition-colors"
          >
            + Add lift
          </button>
        </section>
      )}

      {/* Programme context */}
      {activeSection === 'context' && (
        <section className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Programme Context</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            This is what the AI coach reads on every call. Write your training philosophy, goals, history, injuries, current programme — anything you'd tell a human personal trainer. The more detail, the better the plans.
          </p>
          <textarea
            value={programmeContext}
            onChange={(e) => setProgrammeContext(e.target.value)}
            placeholder="e.g. I'm a 32-year-old male training for Olympic weightlifting, competing at 89kg. Current competition lifts: 95kg snatch, 115kg clean & jerk. I train 5 days a week, with Tuesday and Friday as rest days. Main weaknesses: receiving position in snatch, jerk drive. History: 3 years of CrossFit before transitioning to Oly 2 years ago. No current injuries but occasionally get tight right hip flexor…"
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-brand/50 min-h-64"
          />
          <p className="text-xs text-gray-600">
            {programmeContext.length} characters
          </p>
        </section>
      )}

      <div className="h-4" />
    </div>
  )
}
