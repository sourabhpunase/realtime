import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './cursor.css'
import AuthenticationSystem from './App'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthenticationSystem />
  </StrictMode>,
)
