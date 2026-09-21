import { Link } from 'react-router-dom'

const GuildCard = ({ guild }) => {
  return (
    <div className="glass rounded-xl p-6 hover:bg-opacity-10 transition-all">
      <div className="flex items-center gap-4 mb-4">
        {guild.icon ? (
          <img 
            src={guild.icon} 
            alt={guild.name}
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-2xl font-bold">
            {guild.name.charAt(0)}
          </div>
        )}
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{guild.name}</h3>
          <p className="text-gray-400 text-sm">
            👥 {guild.memberCount.toLocaleString()} üye
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Link 
          to={`/stats/${guild.id}`}
          className="px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors text-center text-sm font-medium"
        >
          📊 İstatistikler
        </Link>
        
        <Link 
          to={`/leaderboard/${guild.id}`}
          className="px-4 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink hover:opacity-90 rounded-lg transition-opacity text-center text-sm font-medium"
        >
          🏆 Liderlik
        </Link>
      </div>
    </div>
  )
}

export default GuildCard
