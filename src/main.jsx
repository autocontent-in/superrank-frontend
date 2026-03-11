import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './printmedia.css'
import App from './App'

import $ from 'jquery'

// Initialize jQuery on the window for MathQuill
window.jQuery = $
window.$ = $

// Stabilize Excalidraw assets
window.EXCALIDRAW_ASSET_PATH = "https://unpkg.com/@excalidraw/excalidraw@0.18.0/dist/"

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
