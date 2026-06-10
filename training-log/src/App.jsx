import React, { useState } from 'react'
import NavBar from './components/NavBar.jsx'
import Today from './tabs/Today.jsx'
import Workout from './tabs/Workout.jsx'
import Food from './tabs/Food.jsx'
import Supps from './tabs/Supps.jsx'
import Alcohol from './tabs/Alcohol.jsx'
import Settings from './tabs/Settings.jsx'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')

  const renderTab = () => {
    switch (activeTab) {
      case 'today': return <Today />
      case 'workout': return <Workout />
      case 'food': return <Food />
      case 'supps': return <Supps />
      case 'alcohol': return <Alcohol />
      case 'settings': return <Settings />
      default: return <Today />
    }
  }

  return (
    <div className="min-h-screen bg-base text-white">
      <main className="pb-nav overflow-y-auto scrollbar-none">
        {renderTab()}
      </main>
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}
