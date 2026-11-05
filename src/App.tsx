import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Offers } from './pages/Offers'
import { OfferForm } from './pages/OfferForm'
import { Campaigns } from './pages/Campaigns'
import { CampaignForm } from './pages/CampaignForm'
import { Reports } from './pages/Reports'
import { ClickLogs } from './pages/ClickLogs'
import { Notifications } from './pages/Notifications'
import { AdCopyStudio } from './pages/AdCopyStudio'
import { AdCopyForm } from './pages/AdCopyForm'
import { AdCopyDetail } from './pages/AdCopyDetail'
import { Settings } from './pages/Settings'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/new" element={<OfferForm />} />
        <Route path="/offers/:id" element={<OfferForm />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/new" element={<CampaignForm />} />
        <Route path="/campaigns/:id" element={<CampaignForm />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/click-logs" element={<ClickLogs />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/ad-copy" element={<AdCopyStudio />} />
        <Route path="/ad-copy/new" element={<AdCopyForm />} />
        <Route path="/ad-copy/:id" element={<AdCopyDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
