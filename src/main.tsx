import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/windows.css'
import './styles/apps.css'
import './styles/connected.css'
import './styles/platform.css'
import './styles/auth.css'
import './teacher/teacher.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
