import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

// Service Worker registration ditangani sepenuhnya oleh VitePWA
// (injectRegister: 'auto' di vite.config.ts). Tidak perlu registrasi manual.

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);


