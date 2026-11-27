import React, { useState } from 'react'
import { load, save } from './lib/storage.js'
import Splash from './screens/Splash.jsx'
import Welcome from './screens/Welcome.jsx'
import Home from './screens/Home.jsx'
import Talk from './screens/Talk.jsx'
import Learn from './screens/Learn.jsx'
import { useTheme } from './ThemeToggle.jsx'

export default function App() {
  const [profile, setProfile] = useState(() => load('profile', null))
  const [screen, setScreen] = useState('splash')
  const [options, setOptions] = useState({})
  const [welcomeStep, setWelcomeStep] = useState(0)
  const theme = useTheme()

  const go = (next, opts = {}) => { setOptions(opts); setScreen(next) }
  const finishWelcome = (p) => { save('profile', p); setProfile(p); go('home') }

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-bg">
      {screen === 'splash' && (
        <Splash
          profile={profile}
          theme={theme}
          onStart={() => { if (profile) go('home'); else { setWelcomeStep(0); go('welcome') } }}
          onChange={() => { setWelcomeStep(1); go('welcome') }}
        />
      )}
      {screen === 'welcome' && (
        <Welcome profile={profile} startStep={welcomeStep} onDone={finishWelcome} theme={theme} />
      )}
      {screen === 'home' && profile && (
        <Home
          profile={profile}
          theme={theme}
          onTalk={() => go('talk')}
          onLearn={() => go('learn')}
          onDemo={() => go('talk', { demo: true })}
          onOffline={() => go('talk', { offline: true })}
          onChange={() => { setWelcomeStep(1); go('welcome') }}
        />
      )}
      {screen === 'talk' && profile && <Talk profile={profile} options={options} theme={theme} onBack={() => go('home')} />}
      {screen === 'learn' && profile && <Learn profile={profile} theme={theme} onBack={() => go('home')} />}
    </main>
  )
}
