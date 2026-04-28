import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './lib/errorBoundary'
import { captureException } from './lib/telemetry'
import './styles/shell.css'

// Top-level handlers for errors that escape the React tree (async callbacks,
// unhandled promise rejections, etc.).
window.addEventListener('error', (e) => {
  captureException(e.error ?? new Error(e.message), { source: 'window.onerror' })
})
window.addEventListener('unhandledrejection', (e) => {
  captureException(e.reason, { source: 'unhandledrejection' })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
