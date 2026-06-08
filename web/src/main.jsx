import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Note: StrictMode intentionally omitted. React 19 StrictMode double-mounts
// every component in dev, which leaves orphaned react-leaflet map instances
// (ghost maps lingering when navigating away from the Live Map page). This is
// a dev-only artifact and has no effect on production builds.
createRoot(document.getElementById('root')).render(
  <App />,
)
