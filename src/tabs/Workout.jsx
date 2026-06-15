import React, { useState, useEffect, useRef } from 'react'
import { supabase, today, formatDate } from '../lib/supabase.js'

const DAY_TEMPLATES = {
  upper_push: {
    label: 'Upper Push',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 5, notes: '' },
      { name: 'Overhead Press', sets: 3, reps: 8, notes: '' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, notes: '' },
      { name: 'Lateral Raises', sets: 4, reps: 15, notes: '' },
      { name: 'Tricep Pushdowns', sets: 3, reps: 12, notes: '' },
    ],
  },
  upper_pull: {
    label: 'Upper Pull',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 4, notes: '' },
      { name: 'Barbell Row', sets: 4, reps: 6, notes: '' },
      { name: 'Pull-Ups', sets: 3, reps: 8, notes: '' },
      { name: 'Face Pulls', sets: 3, reps: 15, notes: '' },
      { name: 'Bicep Curls', sets: 3, reps: 12, notes: '' },
    ],
  },
  lower_squat: {
    label: 'Lower (Squat)',
    exercises: [
      { name: 'Squat', sets: 4, reps: 5, notes: '' },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, notes: '' },
      { name: 'Leg Press', sets: 3, reps: 12, notes: '' },
      { name: 'Leg Curl', sets: 3, reps: 12, notes: '' },
      { name: 'Calf Raises', sets: 4, reps: 15, notes: '' },
    ],
  },
  olympic: {
    label: 'Olympic',
    exercises: [
      { name: 'Snatch', sets: 5, reps: 3, notes: '' },
      { name: 'Clean & Jerk', sets: 5, reps: 2, notes: '' },
      { name: 'Snatch Pull', sets: 3, reps: 4, notes: '' },
      { name: 'Front Squat', sets: 3, reps: 5, notes: '' },
    ],
  },
  cardio: {
    label: 'Cardio',
    exercises: [
      { name: 'Zone 2 Run', sets: 1, reps: 1, notes: '30-45 min' },
    ],
  },
  rest: {
    label: 'Rest / Mobility',
    exercises: [
      { name: 'Mobility Work', sets: 1, reps: 1, notes: '20-30 min' },
    ],
  },
}

function SetRow({ set, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-4 text-center">{set.setNum}</span>
      <input
        type="number"
        value={set.weight || ''}
        onChange={(e) => onChange({ ...set, weight: e.target.value })}
        placeholder="kg"
        className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand/50"
      />
      <span className="text-gray-600 text-xs">×</span>
      <input
        type="number"
        value={set.reps || ''}
        onChange={(e) => onChange({ ...set, reps: e.target.value })}
        placeholder="reps"
        className="w-14 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand/50"
      />
      <button onClick={onRemove} className="ml-auto text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
    </div>
  )
}

function ExerciseCard({ exercise, onUpdate, onRemove }) {
  const addSet = () => {
    const newSet = { setNum: exercise.sets.length + 1, weight: '', reps: exercise.sets[exercise.sets.length - 1]?.reps || '', completed: false }
    onUpdate({ ...exercise, sets: [...exercise.sets, newSet] })
  }
  const updateSet = (idx, updated) => {
    const sets = [...exercise.sets]
    sets[idx] = updated
    onUpdate({ ...exercise, sets })
  }
  const removeSet = (idx) => {
    const sets = exercise.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNum: i + 1 }))
    onUpdate({ ...exercise, sets })
  }

  return (
    <div className="bg-black/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <input
          value={exercise.name}
          onChange={(e) => onUpdate({ ...exercise, name: e.target.value })}
          className="font-semibold text-white bg-transparent focus:outline-none flex-1"
        />
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 text-sm ml-2">Remove</button>
      </div>

      <div className="flex text-xs text-gray-500 gap-8 px-6">
        <span>Weight</span>
        <span>Reps</span>
      </div>

      <div className="space-y-2">
        {exercise.sets.map((set, idx) => (
          <SetRow key={idx} set={set} onChange={(u) => updateSet(idx, u)} onRemove={() => removeSet(idx)} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={addSet} className="text-xs text-brand border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand/10 transition-colors">
          + Add set
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">RPE</span>
          <input
            type="number"
            min="1"
            max="10"
            value={exercise.rpe || ''}
            onChange={(e) => onUpdate({ ...exercise, rpe: e.target.value })}
            placeholder="—"
            className="w-12 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>
    </div>
  )
}

function SessionView({ session, onSave, onClose }) {
  const [exercises, setExercises] = useState(
    session.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets || Array.from({ length: ex.defaultSets || 3 }, (_, i) => ({
        setNum: i + 1, weight: '', reps: ex.defaultReps || '', completed: false,
      })),
    }))
  )
  const [notes, setNotes] = useState(session.notes || '')
  const [sessionRpe, setSessionRpe] = useState(session.rpe || '')
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [photos, setPhotos] = useState(session.photos || [])
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef()

  const addExercise = () => {
    setExercises([...exercises, {
      name: 'New Exercise',
      sets: [{ setNum: 1, weight: '', reps: '', completed: false }],
      rpe: '',
    }])
  }

  const handleAddPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${session.id || crypto.randomUUID()}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('workout-photos')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('workout-photos')
        .getPublicUrl(data.path)
      setPhotos((prev) => [...prev, publicUrl])
    } catch (err) {
      alert('Photo upload failed: ' + err.message)
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = (url) => {
    setPhotos((prev) => prev.filter((p) => p !== url))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      id: session.id || crypto.randomUUID(),
      date: session.date || today(),
      day_id: session.day_id,
      day_name: session.day_name,
      day_type: session.day_type,
      exercises: exercises,
      notes,
      rpe: sessionRpe ? parseFloat(sessionRpe) : null,
      photos,
      created_at: new Date().toISOString(),
    }
    await supabase.from('sessions').upsert(payload)
    setSaving(false)
    onSave?.(payload)
  }

  const handleReview = async () => {
    setReviewLoading(true)
    try {
      const res = await fetch('/api/session-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: { ...session, exercises, notes, rpe: sessionRpe }, date: session.date || today() }),
      })
      const data = await res.json()
      setReview(data.review)
    } catch (e) {
      setReview('Error fetching review: ' + e.message)
    } finally {
      setReviewLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ← Back
        </button>
        <h2 className="font-bold text-lg flex-1">{session.day_name || 'Session'}</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-black font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {exercises.map((ex, idx) => (
        <ExerciseCard
          key={idx}
          exercise={ex}
          onUpdate={(u) => {
            const next = [...exercises]; next[idx] = u; setExercises(next)
          }}
          onRemove={() => setExercises(exercises.filter((_, i) => i !== idx))}
        />
      ))}

      <button
        onClick={addExercise}
        className="w-full border border-dashed border-white/20 rounded-2xl py-3 text-sm text-gray-500 hover:text-white hover:border-white/40 transition-colors"
      >
        + Add exercise
      </button>

      <div className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Session RPE</span>
          <input
            type="number"
            min="1"
            max="10"
            value={sessionRpe}
            onChange={(e) => setSessionRpe(e.target.value)}
            placeholder="1–10"
            className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-brand/50"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes…"
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 resize-none h-20 focus:outline-none focus:border-brand/50"
        />
      </div>

      {/* Photos */}
      <div className="bg-surface rounded-2xl p-4 space-y-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">Photos</h3>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img
                  src={url}
                  alt="Workout photo"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAddPhoto}
        />
        <button
          onClick={() => photoRef.current?.click()}
          disabled={photoUploading}
          className="w-full border border-white/20 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {photoUploading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>📸 Add photo</>
          )}
        </button>
      </div>

      {/* AI Review */}
      <div className="bg-surface rounded-2xl p-4 space-y-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">AI Review</h3>
        {!review && !reviewLoading && (
          <button
            onClick={handleReview}
            className="w-full border border-brand/40 text-brand font-medium py-2.5 rounded-xl text-sm hover:bg-brand/10 transition-colors"
          >
            🤖 Review this session
          </button>
        )}
        {reviewLoading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Reviewing…</span>
          </div>
        )}
        {review && (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed">{review}</pre>
        )}
      </div>
    </div>
  )
}

export default function Workout() {
  const [view, setView] = useState('log') // 'log' | 'calendar' | 'session'
  const [activeSession, setActiveSession] = useState(null)
  const [pastSessions, setPastSessions] = useState([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      if (data) setPastSessions(data)
    }
    load()
  }, [view])

  const startTemplate = (templateKey) => {
    const tmpl = DAY_TEMPLATES[templateKey]
    setActiveSession({
      id: crypto.randomUUID(),
      date: today(),
      day_name: tmpl.label,
      day_type: templateKey,
      exercises: tmpl.exercises.map((ex) => ({
        name: ex.name,
        defaultSets: ex.sets,
        defaultReps: ex.reps,
        notes: ex.notes,
        sets: Array.from({ length: ex.sets }, (_, i) => ({ setNum: i + 1, weight: '', reps: ex.reps, completed: false })),
        rpe: '',
      })),
      notes: '',
      rpe: '',
      photos: [],
    })
    setView('session')
  }

  const handlePhotoImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'workout')
      const res = await fetch('/api/food-parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.session) {
        setActiveSession({ ...data.session, id: crypto.randomUUID(), date: today(), photos: [] })
        setView('session')
      }
    } catch (e) {
      alert('Could not parse image: ' + e.message)
    } finally {
      setPhotoLoading(false)
    }
  }

  if (view === 'session' && activeSession) {
    return (
      <div className="px-4 pt-6">
        <SessionView
          session={activeSession}
          onSave={() => { setView('log'); setActiveSession(null) }}
          onClose={() => { setView('log'); setActiveSession(null) }}
        />
        <div className="h-4" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('log')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'log' ? 'bg-brand text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Log
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-brand text-black' : 'text-gray-400 hover:text-white'}`}
          >
            History
          </button>
        </div>
      </div>

      {view === 'log' && (
        <>
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Start Session</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DAY_TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => startTemplate(key)}
                  className="bg-surface hover:bg-white/10 rounded-2xl p-4 text-left transition-colors"
                >
                  <p className="font-semibold text-sm">{tmpl.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.exercises.length} exercises</p>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-surface rounded-2xl p-4 space-y-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-widest">Import from Photo</h2>
            <p className="text-xs text-gray-500">Take a photo of a whiteboard or handwritten session plan and Claude will parse it.</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoImport} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoLoading}
              className="w-full border border-white/20 text-white py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {photoLoading ? '⏳ Parsing…' : '📷 Import from photo'}
            </button>
          </section>
        </>
      )}

      {view === 'calendar' && (
        <section className="space-y-3">
          {pastSessions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No sessions logged yet.</p>
          )}
          {pastSessions.map((s) => (
            <div
              key={s.id}
              className="bg-surface rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => { setActiveSession(s); setView('session') }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{s.day_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(s.date)}</p>
                </div>
                <div className="text-right">
                  {s.rpe && <p className="text-sm text-gray-400">RPE {s.rpe}</p>}
                  <p className="text-xs text-gray-600">{s.exercises?.length || 0} exercises</p>
                  {s.photos?.length > 0 && <p className="text-xs text-gray-600">📸 {s.photos.length}</p>}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="h-4" />
    </div>
  )
}
