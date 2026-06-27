import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/black-han-sans/korean-400.css'
import '@fontsource/oswald/latin-500.css'
import '@fontsource/oswald/latin-600.css'
import App from './App'
import './styles.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('numberball:update', { detail: { update: () => updateSW(true) } }))
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('numberball:offline-ready'))
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
