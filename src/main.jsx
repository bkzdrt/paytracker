import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import '@fontsource/sometype-mono/500.css'
import '@fontsource/sometype-mono/600.css'
import './styles.css'
import { AppProvider } from './app/store'
import App from './App'
import UpdateToast from './components/UpdateToast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
      <UpdateToast />
    </AppProvider>
    <Analytics />
  </React.StrictMode>
)
