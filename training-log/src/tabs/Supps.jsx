import React, { useState, useEffect } from 'react'
import { supabase, today } from '../lib/supabase.js'

const DEFAULT_SUPPS = [
  { name: 'Creatine', dose: '5g', icon: '💊' },
  { name: 'Omega-3', dose: '2 caps', icon: '🐟' },
  { name: 'Vitamin D3', dose: '4000 IU', icon: '☀️' },
  { name: 'Magnesium', dose: '400mg', icon: '⚡' },
  { name: 'Zinc', dose: '25mg', icon: '🔩' },
  { name: 'Protein Shake', dose: '1 scoop', icon: '🥤' },
]

const RECOVERY_TYPES = [
  { key: 'sauna', label: 'Sauna', icon: '🌡️', unit: 'min' },
  { key: 'ice_bath', label: 'Ice Bath', icon: '🧊', unit: 'min' },
  { key: 'sleep', label: 'Nap', icon: '😴', unit: 'min' },
  { key: 'walk', label: 'Walk', icon: '🚶', unit: 'min' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-white/10'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )
}

export default function Supps() {
  const [suppsTaken, setSuppsTaken] = useState({})
  const [recovery, setRecovery] = useState([])
  const [showRecoveryForm, setShowRecoveryForm] = useState(false)
  const [recoveryType, setRecoveryType] = useState('sauna')
  const [recoveryDuration, setRecoveryDuration] = useState('')
  const [recoveryNotes, setRecoveryNotes] = useState('')
  const dateStr = today()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('supps_entries')
        .select('*')
        .eq('date', dateStr)
      if (data) {
        const taken = {}
        data.forEach((e) => { taken[e.name] = e.id })
        setSuppsTaken(taken)
        setRecovery(data.filter((e) => e.type === 'recovery'))
      }
    }
    load()
  }, [])

  const toggleSupp = async (supp) => {
    const key = supp.name
    if (suppsTaken[key]) {
      await supabase.from('supps_entries').delete().eq('id', suppsTaken[key])
      setSuppsTaken((prev) => { const n = { ...prev }; delete n[key]; return n })
    } else {
      const row = {
        id: crypto.randomUUID(),
        date: dateStr,
        name: key,
        dose: supp.dose,
        type: 'supplement',
        created_at: new Date().toISOString(),
      }
      await supabase.from('supps_entries').insert(row)
      setSuppsTaken((prev) => ({ ...prev, [key]: row.id }))
    }
  }

  const logRecovery = async () => {
    const row = {
      id: crypto.randomUUID(),
      date: dateStr,
      name: recoveryType,
      dose: recoveryDuration ? `${recoveryDuration} min` : null,
      notes: recoveryNotes || null,
      type: 'recovery',
      created_at: new Date().toISOString(),
    }
    await supabase.from('supps_entries').insert(row)
    setRecovery([...recovery, row])
    setShowRecoveryForm(false)
    setRecoveryDuration('')
    setRecoveryNotes('')
  }

  const removeRecovery = async (id) => {
    await supabase.from('supps_entries').delete().eq('id', id)
    setRecovery(recovery.filter((r) => r.id !== id))
  }

  const takenCount = Object.keys(suppsTaken).filter((k) => DEFAULT_SUPPS.find((s) => s.name === k)).length

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supps</h1>
        <span className="text-sm text-gray-500">{takenCount}/{DEFAULT_SUPPS.length} taken</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all"
          style={{ width: `${(takenCount / DEFAULT_SUPPS.length) * 100}%` }}
        />
      </div>

      {/* Supplements */}
      <section className="bg-surface rounded-2xl divide-y divide-white/5">
        {DEFAULT_SUPPS.map((supp) => (
          <div key={supp.name} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-xl">{supp.icon}</span>
              <div>
                <p className="text-sm font-medium">{supp.name}</p>
                <p className="text-xs text-gray-500">{supp.dose}</p>
              </div>
            </div>
            <Toggle
              checked={!!suppsTaken[supp.name]}
              onChange={() => toggleSupp(supp)}
            />
          </div>
        ))}
      </section>

      {/* Recovery */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">Recovery</h2>
          <button
            onClick={() => setShowRecoveryForm(!showRecoveryForm)}
            className="text-xs text-brand"
          >
            + Log
          </button>
        </div>

        {showRecoveryForm && (
          <div className="bg-surface rounded-2xl p-4 space-y-3 mb-3">
            <div className="grid grid-cols-4 gap-2">
              {RECOVERY_TYPES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRecoveryType(r.key)}
                  className={`rounded-xl py-2 flex flex-col items-center gap-1 text-xs transition-colors ${
                    recoveryType === r.key ? 'bg-brand text-black font-bold' : 'bg-black/30 text-gray-400'
                  }`}
                >
                  <span className="text-lg">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={recoveryDuration}
                onChange={(e) => setRecoveryDuration(e.target.value)}
                placeholder="Duration"
                className="w-28 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
            <input
              value={recoveryNotes}
              onChange={(e) => setRecoveryNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand/50 placeholder:text-gray-600"
            />
            <div className="flex gap-2">
              <button onClick={logRecovery} className="flex-1 bg-brand text-black font-bold py-2.5 rounded-xl text-sm">
                Save
              </button>
              <button onClick={() => setShowRecoveryForm(false)} className="flex-1 border border-white/20 text-gray-400 py-2.5 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {recovery.length > 0 ? (
          <div className="bg-surface rounded-2xl divide-y divide-white/5">
            {recovery.map((r) => {
              const type = RECOVERY_TYPES.find((t) => t.key === r.name) || { icon: '💆', label: r.name }
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{type.label}</p>
                      {r.dose && <p className="text-xs text-gray-500">{r.dose}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeRecovery(r.id)} className="text-gray-600 hover:text-red-400 text-lg">×</button>
                </div>
              )
            })}
          </div>
        ) : (
          !showRecoveryForm && (
            <p className="text-sm text-gray-600 text-center py-4">No recovery logged today</p>
          )
        )}
      </section>

      <div className="h-4" />
    </div>
  )
}
