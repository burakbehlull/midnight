import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function GeneralSettingsTab({ guildId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceChannelId, setVoiceChannelId] = useState('');

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings(guildId);
      setVoiceChannelId(res.data.voiceChannelId || '');
    } catch (error) {
      console.error(error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.updateSettings(guildId, {
        voiceChannelId: voiceChannelId.trim() || null,
      });
      setVoiceChannelId(res.data.settings.voiceChannelId || '');
      toast.success('Ayarlar kaydedildi');
    } catch (error) {
      console.error(error);
      toast.error('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400">Yükleniyor...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <section>
        <h3 className="text-lg font-semibold mb-3">🔊 Ses Kanalı</h3>
        <p className="text-xs text-gray-500 mb-3">
          Ses kanalının ID'sini girin; bot bu kanala katılır. Kanalı boş bırakıp kaydederseniz bot
          ses kanalından ayrılır.
        </p>
        <label className="block">
          <span className="block text-xs text-gray-400 mb-1">Ses Kanalı ID</span>
          <input
            type="text"
            value={voiceChannelId}
            onChange={(e) => setVoiceChannelId(e.target.value)}
            placeholder="Örn: 123456789012345678"
            className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none"
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          Kanal ID'sini almak için kanala sağ tıklayıp <b>Kanal ID'sini Kopyala</b> seçeneğini
          kullanın (Geliştirici Modu açık olmalı).
        </p>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-midnight-purple to-midnight-pink font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}
