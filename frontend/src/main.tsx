import React from 'react'

// Auto-redirect from old Render URL to new Vercel URL
if (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('businessmate.onrender.com')) {
  window.location.replace('https://businessmate-plum.vercel.app' + window.location.pathname + window.location.search);
}

import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import axios from 'axios'

// Axios Global Configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Automatic update registration for the PWA with auto-reload on update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  }
})

// Redirect Vercel domain to custom domain
if (window.location.hostname === 'businessmate-plum.vercel.app') {
  window.location.replace('https://billscale.in' + window.location.pathname + window.location.search);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
