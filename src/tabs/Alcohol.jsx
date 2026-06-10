import React, { useState, useEffect } from 'react'
import { supabase, today, getWeekStart, formatDate } from '../lib/supabase.js'

// UK units per drink type and size
const DRINK_TYPES = [
  { key: 'beer_pint', label: 'Beer (Pint)', units: 2.3, calories: 215, abv: 4.5, volume: 568 },
  { key: 'beer_half', label: 'Beer (Half)', units: 1.1, calories: 105, abv: 4.5, volume: 284 },
  { key: 'wine_large', label: 'Wine (250ml)', units: 3.0, calories: 215, abv: 12, volume: 250 },
  { key: 'wine_small', label: 'Wine (125ml)', units: 1.5, calories: 100, abv: 12, volume: 125 },
  { key: 'spirits_single', label: 'Spirits (single 25ml)', units: 1.0, calories: 55, abv: 40, volume: 25 },
  { key: 'spirits_double', label: 'Spirits (double 50ml)', units: 2.0, calories: 110, abv: 40, volume: 50 },
  { key: 'cocktail', label: 'Cocktail', units: 2.5, calories: 200, abv: null, volume: null },
  { key: 'prosecco', label: 'Prosecco (125ml)', units: 1.5, calories: 90, abv: 12, volume: 125 },
]

function UnitBar({ used, limit }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-400' : 'bg-brand'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">This week</span>
        <span>
          <span className={pct > 90 ? 'text-red-400' : 'text-white'}>{used.toFixed(1)}</span>
          <span className="text-gray-600"> / {limit} units</span>
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Alcohol() {
  const [entries, setEntries] = useState([])
  const [weekEntries, setWeekEntries] = useState([])
  const [weeklyLimit, setWeeklyLimit] = useState(14)
  const [showForm, setShowForm] = useState(false)
  const [selectedDrink, setSelectedDrink] = useState(DRINK_TYPES[0])
  const [quantity, setQuantity] = useState('1')
  const [venue, setVenue] = useState('')
  const dateStr = today()
  const weekStart = getWeekStart()

  useEffect(() => {
    load()
    loadSettings()
  }, [])

  const load = async () => {
    const { data: todayData } = await supabase
      .from('alcohol_entries')
      .select('*')
      .eq('date', dateStr)
      .order('created_at', { ascending: true })
    if (todayData) setEntries(todayData)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const { data: weekData } = await supabase
      .from('alcohol_entries')
      .select('*')
      .gte('date', weekStart)
      .lt('date', weekEnd.toISOString().split('T')[0])
    if (weekData) setWeekEntries(weekData)
  }

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('weekly_alcohol_limit').limit(1).single()
    if (data?.weekly_alcohol_limit) setWeeklyLimit(data.weekly_alcohol_limit)
  }

  const logDrink = async () => {
    const qty = parseFloat(quantity) || 1
    const row = {
      id: crypto.randomUUID(),
      date: dateStr,
      drink_type: selectedDrink.key,
      drink_name: selectedDrink.label,
      quantity: qty,
      units: +(selectedDrink.units * qty).toFixed(2),
      calories: Math.round(selectedDrink.calories * qty),
      venue: venue || null,
      created_at: new Date().toISOString(),
    }
    await supabase.from('alcohol_entries').insert(row)
    setEntries([...entries, row])
    setWeekEntries([...weekEntries, row])
    setShowForm(false)
    setVenue('')
    setQuantity('1')
  }

  const removeEntry = async (id) => {
    await supabase.from('alcohol_entries').delete().eq('id', id)
    setEntries(entries.filter((e) => e.id !== id))
    setWeekEntries(weekEntries.filter((e) => e.id !== id))
  }

  const weekUnits = weekEntries.reduce((a, e) => a + (e.units || 0), 0)
  const todayUnits = entries.reduce((a, e) => a + (e.units || 0), 0)
  const todayCals = entries.reduce((a, e) => a + (e.calories || 0), 0)

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alcohol</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand text-black font-bold px-4 py-2 rounded-xl text-sm"
        >
          + Add
        </button>
      </div>

      {/* Weekly unit tracker */}
      <div className="bg-surface rounded-2xl p-4 space-y-3">
        <UnitBar used={weekUnits} limit={weeklyLimit} />
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Today: <span className="text-white">{todayUnits.toFixed(1)} units</span></span>
          <span>{todayCals} kcal</span>
        </div>
      </div>

      {/* Add drink form */}
      {showForm && (
        <div className="bg-surface rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold">Log a drink</h2>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto scrollbar-none">
            {DRINK_TYPES.map((d) => (
              <button
                key={d.key}
                onClick={() => setSelectedDrink(d)}
                className={`rounded-xl p-3 text-left transition-colors ${
                  selectedDrink.key === d.key ? 'bg-brand text-black' : 'bg-black/30 text-gray-300'
                }`}
              >
                <p className="text-xs font-medium leading-tight">{d.label}</p>
                <p className={`text-xs mt-0.5 ${selectedDrink.key === d.key ? 'text-black/60' : 'text-gray-600'}`}>
                  {d.units} units · {d.calories} kcal
                </p>
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-400">Qty</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-brand/50"
            />
            <div className="text-xs text-gray-500 ml-2">
              = {(selectedDrink.units * (parseFloat(quantity) || 1)).toFixed(1)} units · {Math.round(selectedDrink.calories * (parseFloat(quantity) || 1))} kcal
            </div>
          </div>

          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Venue (optional)"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand/50"
          />

          <div className="flex gap-2">
            <button onClick={logDrink} className="flex-1 bg-brand text-black font-bold py-2.5 rounded-xl text-sm">
              Log drink
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 border border-white/20 text-gray-400 py-2.5 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Today's drinks */}
      {entries.length > 0 && (
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Today</h2>
          <div className="bg-surface rounded-2xl divide-y divide-white/5">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{e.quantity > 1 ? `${e.quantity}× ` : ''}{e.drink_name}</p>
                  <p className="text-xs text-gray-500">{e.units} units · {e.calories} kcal{e.venue ? ` · ${e.venue}` : ''}</p>
                </div>
                <button onClick={() => removeEntry(e.id)} className="text-gray-600 hover:text-red-400 text-lg">×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && !showForm && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No drinks logged today 🎉</p>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
