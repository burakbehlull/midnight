import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomCommandsTab from '../components/CustomCommandsTab';
import ActionsTab from '../components/ActionsTab';
import { api } from '../api/client';

export default function GuildSettings() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('commands');

  useEffect(() => {
    loadGuild();
  }, [guildId]);

  const loadGuild = async () => {
    try {
      setLoading(true);
      const guildsRes = await api.getGuilds();
      const foundGuild = guildsRes.data.find(g => g.id === guildId);
      setGuild(foundGuild);
    } catch (error) {
      console.error('Guild yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Sunucu bulunamadı</h2>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-midnight-purple rounded-lg hover:opacity-90 transition-opacity"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'commands', label: '🔧 Özel Komutlar', icon: '🔧' },
    { id: 'actions', label: '✨ Actions', icon: '✨' },
    { id: 'general', label: '⚙️ Genel Ayarlar', icon: '⚙️' },
    { id: 'moderation', label: '🛡️ Moderasyon', icon: '🛡️' },
    { id: 'logs', label: '📊 Loglama', icon: '📊' }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors flex items-center gap-2"
        >
          ← Geri
        </button>
        <div className="flex items-center gap-3">
          {guild.icon ? (
            <img
              src={guild.icon}
              alt={guild.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-xl font-bold">
              {guild.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{guild.name}</h1>
            <p className="text-gray-400 text-sm">Sunucu Ayarları</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                currentTab === tab.id
                  ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink text-white'
                  : 'text-gray-400 hover:text-white hover:bg-midnight-light'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass rounded-xl p-6 relative">
        {currentTab === 'commands' && <CustomCommandsTab guildId={guildId} />}
        
        {currentTab === 'actions' && <ActionsTab guildId={guildId} />}
        
        {currentTab === 'general' && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">Genel ayarlar</p>
            <p className="text-gray-500 text-sm">Yakında eklenecek...</p>
          </div>
        )}
        
        {currentTab === 'moderation' && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">Moderasyon ayarları</p>
            <p className="text-gray-500 text-sm">Yakında eklenecek...</p>
          </div>
        )}
        
        {currentTab === 'logs' && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">Log ayarları</p>
            <p className="text-gray-500 text-sm">Yakında eklenecek...</p>
          </div>
        )}
      </div>
    </div>
  );
}
