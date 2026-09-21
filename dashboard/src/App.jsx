import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import ServerStats from './pages/ServerStats'
import Leaderboard from './pages/Leaderboard'
import GlobalEconomy from './pages/GlobalEconomy'
import BotSettings from './pages/BotSettings'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/economy/global" element={<GlobalEconomy />} />
          <Route path="/bot/settings" element={<BotSettings />} />
          <Route path="/stats/:guildId" element={<ServerStats />} />
          <Route path="/leaderboard/:guildId" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
