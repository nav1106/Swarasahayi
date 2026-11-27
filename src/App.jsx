import React, { useEffect, useState } from 'react'
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

  // Every screen change is a browser-history entry, so the phone's Back button steps back inside the app.
  const go = (next, opts = {}, replace = false) => {
    const state = { screen: next, options: opts }
    if (replace) window.history.replaceState(state, '')
    else window.history.pushState(state, '')
    setOptions(opts)
    setScreen(next)
  }
  const back = () => window.history.back()
  useEffect(() => {
    window.history.replaceState({ screen: 'splash', options: {} }, '')
    const onPop = (e) => {
      const st = e.state
      setOptions(st?.options || {})
      setScreen(st?.screen || 'splash')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const finishWelcome = (p) => { save('profile', p); setProfile(p); go('home', {}, true) }

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
      {screen === 'talk' && profile && <Talk profile={profile} options={options} theme={theme} onBack={back} />}
      {screen === 'learn' && profile && <Learn profile={profile} theme={theme} onBack={back} />}
    </main>
  )
}
