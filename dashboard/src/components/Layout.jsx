import { Link, useLocation } from 'react-router-dom'

const Layout = ({ children }) => {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink' : 'hover:bg-midnight-light'
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-midnight-dark border-r border-midnight-light">
        <div className="p-6">
          <h1 className="text-3xl font-bold gradient-text mb-8">Midnight</h1>
          
          <nav className="space-y-2">
            <Link
              to="/"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">🏠</span>
                <span>Ana Sayfa</span>
              </span>
            </Link>

            <Link
              to="/economy/global"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/economy/global')}`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">💰</span>
                <span>Global Ekonomi</span>
              </span>
            </Link>

            <Link
              to="/bot/settings"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/bot/settings')}`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <span>Bot Ayarları</span>
              </span>
            </Link>

            <Link
              to="/admin"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/admin')}`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <span>Admin Panel</span>
              </span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
