import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

const EVENT_LABELS = {
  roleCreate: 'Rol Oluşturma',
  roleDelete: 'Rol Silme',
  roleUpdate: 'Rol Güncelleme',
  channelCreate: 'Kanal Oluşturma',
  channelDelete: 'Kanal Silme',
  channelUpdate: 'Kanal Güncelleme',
  ban: 'Ban',
  kick: 'Kick',
  roleAssign: 'Rol Verme',
  botAdd: 'Bot Ekleme',
  guildUpdate: 'Sunucu Güncelleme',
  vanityUpdate: 'Vanity URL',
  spam: 'Spam',
  advertisement: 'Reklam',
  protectedRoleAssign: 'Korumalı Rol',
};

const STATUS_LABELS = {
  prevented: { text: 'Engellendi', color: 'text-green-400' },
  punished: { text: 'Cezalandırıldı', color: 'text-red-400' },
  restored: { text: 'Geri Yüklendi', color: 'text-blue-400' },
  logged: { text: 'Kaydedildi', color: 'text-gray-400' },
};

const ACTION_LABELS = {
  ban: 'Ban',
  kick: 'Kick',
  mute: 'Mute',
  jail: 'Jail',
  warn: 'Warn',
  manual: 'Manuel',
};

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-midnight-purple' : 'bg-midnight-light'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none"
      />
    </label>
  );
}

export default function Guard() {
  const [health, setHealth] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuard();
  }, []);

  const loadGuard = async () => {
    try {
      setLoading(true);
      const [healthRes, guildsRes] = await Promise.all([
        api.getGuardHealth(),
        api.getGuardGuilds(),
      ]);
      setHealth(healthRes.data);
      setGuilds(guildsRes.data);
      if (guildsRes.data.length > 0) setGuildId(guildsRes.data[0].id);
    } catch (error) {
      console.error('Guard verileri yüklenemedi:', error);
      toast.error('Guard botu verileri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-midnight-purple"></div>
      </div>
    );
  }

  const online = health?.status === 'online';

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {health?.bot?.avatar ? (
            <img src={health.bot.avatar} alt="Guard" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-2xl">
              🛡️
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">Guard</h1>
            <p className="text-gray-400 text-sm">
              {health?.bot ? health.bot.tag : 'Guard botu kapalı'} ·{' '}
              <span className={online ? 'text-green-400' : 'text-red-400'}>
                {online ? 'Çevrimiçi' : 'Çevrimdışı'}
              </span>{' '}
              · {health?.guildCount ?? 0} sunucu
            </p>
          </div>
        </div>

        {guilds.length > 0 && (
          <select
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            className="px-4 py-3 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none"
          >
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!online && (
        <div className="mb-6 p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm">
          Guard botu çevrimdışı. <code>GUARD_TOKEN</code> değerini <code>.env</code> dosyasına
          ekleyip botu yeniden başlatın.
        </div>
      )}

      {online && guilds.length === 0 && (
        <div className="p-6 rounded-xl glass text-center text-gray-400">
          Guard botu hiçbir sunucuda bulunmuyor.
        </div>
      )}

      {guildId && (
        <>
          <div className="glass rounded-xl p-1 mb-6">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'settings', label: '⚙️ Guard Ayarları' },
                { id: 'logs', label: '📋 Guard Logları' },
                { id: 'moderators', label: '👮 Moderatörler' },
                { id: 'backups', label: '💾 Yedekler' },
                { id: 'commands', label: '🔑 Komut Yetkileri' },
                { id: 'message', label: '✉️ Mesaj Gönder' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    tab === item.id
                      ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink text-white'
                      : 'text-gray-400 hover:text-white hover:bg-midnight-light'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            {tab === 'settings' && <GuardSettings guildId={guildId} />}
            {tab === 'logs' && <GuardLogs guildId={guildId} />}
            {tab === 'moderators' && <GuardModerators guildId={guildId} />}
            {tab === 'backups' && <GuardBackups guildId={guildId} />}
            {tab === 'commands' && <GuardCommandPermissions guildId={guildId} />}
            {tab === 'message' && <GuardMessageSender guildId={guildId} />}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Ayarlar ─────────────────────────── */
const PUNISHMENT_TYPES = [
  ['roleCreate', 'Rol Oluşturma'],
  ['roleDelete', 'Rol Silme'],
  ['roleUpdate', 'Rol Güncelleme'],
  ['channelCreate', 'Kanal Oluşturma'],
  ['channelDelete', 'Kanal Silme'],
  ['channelUpdate', 'Kanal Güncelleme'],
  ['ban', 'Ban'],
  ['kick', 'Kick'],
  ['roleAssign', 'Rol Verme'],
  ['botAdd', 'Bot Ekleme'],
  ['guildUpdate', 'Sunucu Güncelleme'],
  ['vanityUpdate', 'Vanity Değişikliği'],
];

const PUNISHMENT_ACTIONS = [
  ['ban', 'Ban'],
  ['kick', 'Kick'],
  ['removePerms', 'Yetki Çek'],
  ['jail', 'Jail'],
  ['closePerms', 'Yetki Kapat'],
  ['none', 'Cezasız'],
];

const GUARD_TOGGLES = [
  ['banGuard', 'Ban Guard'],
  ['kickGuard', 'Kick Guard'],
  ['roleAssignGuard', 'Rol Verme Guard'],
  ['botGuard', 'Bot Guard'],
  ['guildUpdateGuard', 'Sunucu Güncelleme Guard'],
  ['vanityGuard', 'Vanity Guard'],
  ['webhookGuard', 'Webhook Guard'],
  ['spamGuard', 'Spam Guard'],
  ['advertisementGuard', 'Reklam Guard'],
];

function ListRow({ label, sub, avatar, color, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-midnight-light/40 p-2">
      <span className="flex items-center gap-2 text-sm min-w-0">
        {avatar && <img src={avatar} alt="" className="w-6 h-6 rounded-full" />}
        {color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
        <span className="truncate">{label}</span>
        {sub && <span className="text-xs text-gray-500 truncate">{sub}</span>}
      </span>
      <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm flex-shrink-0 ml-2">
        ✖ Çıkar
      </button>
    </div>
  );
}

function RoleListEditor({ title, icon, roles = [], items = [], onAdd, onRemove }) {
  const [selected, setSelected] = useState('');

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected);
    setSelected('');
  };

  return (
    <div className="rounded-lg bg-midnight-base border border-midnight-light p-4">
      <h4 className="font-semibold mb-3">{icon} {title}</h4>
      <div className="flex gap-2 mb-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none text-sm"
        >
          <option value="">Rol seç...</option>
          {roles
            .filter((r) => !items.includes(r.id))
            .map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selected}
          className="px-4 py-2 rounded-lg bg-midnight-purple/20 border border-midnight-purple hover:bg-midnight-purple/30 transition-colors disabled:opacity-50 text-sm"
        >
          + Ekle
        </button>
      </div>
      <div className="space-y-1">
        {items.map((id) => {
          const role = roles.find((r) => r.id === id);
          return (
            <ListRow
              key={id}
              label={role?.name || id}
              color={role?.hexColor || '#99AAB5'}
              onRemove={() => onRemove(id)}
            />
          );
        })}
        {items.length === 0 && <p className="text-gray-500 text-center py-2 text-sm">Liste boş</p>}
      </div>
    </div>
  );
}

function MemberListEditor({ title, icon, guildId, items = [], onAdd, onRemove, botsOnly = false, nameCache = {} }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      const res = await api.getGuardMembers(guildId, { search: query, limit: 25 });
      setResults((res.data.members || []).filter((m) => (botsOnly ? m.bot : true)));
      setSearched(true);
    } catch (error) {
      console.error(error);
      toast.error('Arama başarısız');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-lg bg-midnight-base border border-midnight-light p-4">
      <h4 className="font-semibold mb-3">{icon} {title}</h4>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder={botsOnly ? 'Bot ara...' : 'Kullanıcı ara...'}
          className="flex-1 px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none text-sm"
        />
        <button
          onClick={search}
          disabled={searching}
          className="px-4 py-2 rounded-lg bg-midnight-purple/20 border border-midnight-purple hover:bg-midnight-purple/30 transition-colors disabled:opacity-50"
        >
          {searching ? '⏳' : '🔍'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="mb-2 rounded-lg bg-midnight-light/30 border border-midnight-light p-2 max-h-[150px] overflow-y-auto">
          {results.map((m) => (
            <div
              key={m.userId}
              onClick={() => !items.includes(m.userId) && onAdd(m.userId, m)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-midnight-light ${
                items.includes(m.userId) ? 'opacity-50' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                {m.avatar && <img src={m.avatar} alt="" className="w-6 h-6 rounded-full" />}
                {m.globalName || m.username}
              </span>
              <span className="text-green-400 text-sm">
                {items.includes(m.userId) ? '✓ Eklendi' : '+ Ekle'}
              </span>
            </div>
          ))}
        </div>
      )}
      {searched && results.length === 0 && (
        <p className="text-gray-500 text-center py-2 text-sm mb-2">Sonuç bulunamadı</p>
      )}
      <div className="space-y-1">
        {items.map((id) => (
          <ListRow
            key={id}
            label={nameCache[id]?.label || id}
            avatar={nameCache[id]?.avatar}
            onRemove={() => onRemove(id)}
          />
        ))}
        {items.length === 0 && <p className="text-gray-500 text-center py-2 text-sm">Liste boş</p>}
      </div>
    </div>
  );
}

function GuardSettings({ guildId }) {
  const [settings, setSettings] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [names, setNames] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    try {
      const [settingsRes, channelsRes, rolesRes] = await Promise.all([
        api.getGuardSettings(guildId),
        api.getGuardChannels(guildId).catch(() => ({ data: [] })),
        api.getGuardRoles(guildId).catch(() => ({ data: [] })),
      ]);
      setSettings(settingsRes.data);
      setChannels(channelsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Guard ayarları yüklenemedi');
    }
  };

  const patch = (updater) => setSettings((prev) => updater(structuredClone(prev)));

  const addTo = (getter, value) => {
    if (!value) return;
    patch((s) => {
      const arr = getter(s);
      if (Array.isArray(arr) && !arr.includes(value)) arr.push(value);
      return s;
    });
  };

  const removeFrom = (getter, value) =>
    patch((s) => {
      const arr = getter(s);
      if (Array.isArray(arr)) {
        const i = arr.indexOf(value);
        if (i >= 0) arr.splice(i, 1);
      }
      return s;
    });

  const cacheName = (id, member) =>
    setNames((prev) => ({
      ...prev,
      [id]: { label: member.globalName || member.username, avatar: member.avatar },
    }));

  const togglePunishment = (type, action) =>
    patch((s) => {
      if (!s.punishments[type]) s.punishments[type] = { actions: [], default: [] };
      const entry = s.punishments[type];
      let arr =
        Array.isArray(entry.actions) && entry.actions.length
          ? [...entry.actions]
          : [...(entry.default || [])];
      if (action === 'none') {
        arr = arr.includes('none') ? [] : ['none'];
      } else {
        arr = arr.filter((a) => a !== 'none');
        arr = arr.includes(action) ? arr.filter((a) => a !== action) : [...arr, action];
      }
      entry.actions = arr;
      return s;
    });

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.updateGuardSettings(guildId, settings);
      setSettings(res.data);
      toast.success('Guard ayarları kaydedildi');
    } catch (error) {
      console.error(error);
      toast.error('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p className="text-gray-400">Yükleniyor...</p>;

  const g = settings.guards;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold mb-3">Genel</h3>
        <Toggle
          label="Guard sistemini etkinleştir"
          description="Kapalıyken guard korumaları çalışmaz"
          checked={settings.safeguard.enabled}
          onChange={(v) => patch((s) => { s.safeguard.enabled = v; return s; })}
        />
        <Toggle
          label="Yetkileri kilitle (acil durum)"
          description="Açıkken guard hiçbir işlem yapmaz"
          checked={settings.permissionsLocked}
          onChange={(v) => patch((s) => { s.permissionsLocked = v; return s; })}
        />
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Log kanalı</span>
            <select
              value={settings.logChannel || ''}
              onChange={(e) => patch((s) => { s.logChannel = e.target.value || null; return s; })}
              className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
            >
              <option value="">Kapalı</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Jail rolü</span>
            <select
              value={settings.safeguard.jailRole || ''}
              onChange={(e) => patch((s) => { s.safeguard.jailRole = e.target.value || null; return s; })}
              className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
            >
              <option value="">Seçilmedi</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">
              Ses kanalı ID (bot bu kanala girer)
            </span>
            <input
              type="text"
              value={settings.voiceChannelId || ''}
              onChange={(e) => patch((s) => { s.voiceChannelId = e.target.value.trim() || null; return s; })}
              placeholder="Örn: 123456789012345678"
              className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Kanal ID'sini almak için kanala sağ tıklayıp <b>Kanal ID'sini Kopyala</b> seçeneğini
            kullanın. Boş bırakıp kaydederseniz guard botu ses kanalından ayrılır.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Güvenlik Listeleri</h3>
        <p className="text-xs text-gray-500 mb-3">
          Güvenli kullanıcı/rol/bot ve korumalı roller bu listelerdeki guard kontrollerinden muaftır.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <RoleListEditor
            title="Güvenli Roller"
            icon="🎭"
            roles={roles}
            items={settings.safeguard.safeRoles || []}
            onAdd={(v) => addTo((s) => s.safeguard.safeRoles, v)}
            onRemove={(v) => removeFrom((s) => s.safeguard.safeRoles, v)}
          />
          <RoleListEditor
            title="Korumalı Roller"
            icon="🛡️"
            roles={roles}
            items={settings.protectedRoles || []}
            onAdd={(v) => addTo((s) => s.protectedRoles, v)}
            onRemove={(v) => removeFrom((s) => s.protectedRoles, v)}
          />
          <MemberListEditor
            title="Güvenli Kullanıcılar"
            icon="👤"
            guildId={guildId}
            nameCache={names}
            items={settings.safeguard.safeUsers || []}
            onAdd={(id, m) => { cacheName(id, m); addTo((s) => s.safeguard.safeUsers, id); }}
            onRemove={(v) => removeFrom((s) => s.safeguard.safeUsers, v)}
          />
          <MemberListEditor
            title="İzinli Botlar (Bot İzni)"
            icon="🤖"
            guildId={guildId}
            botsOnly
            nameCache={names}
            items={settings.safeguard.allowedBots || []}
            onAdd={(id, m) => { cacheName(id, m); addTo((s) => s.safeguard.allowedBots, id); }}
            onRemove={(v) => removeFrom((s) => s.safeguard.allowedBots, v)}
          />
          <MemberListEditor
            title="Whitelist Botlar"
            icon="♾️"
            guildId={guildId}
            botsOnly
            nameCache={names}
            items={settings.safeguard.whitelistBots || []}
            onAdd={(id, m) => { cacheName(id, m); addTo((s) => s.safeguard.whitelistBots, id); }}
            onRemove={(v) => removeFrom((s) => s.safeguard.whitelistBots, v)}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Korumalar</h3>
        <div className="grid md:grid-cols-2 gap-x-8">
          <div>
            <p className="text-sm text-gray-400 mt-2 mb-1">Rol Guard</p>
            <Toggle label="Oluşturma" checked={g.roleGuard.create}
              onChange={(v) => patch((s) => { s.guards.roleGuard.create = v; return s; })} />
            <Toggle label="Silme" checked={g.roleGuard.delete}
              onChange={(v) => patch((s) => { s.guards.roleGuard.delete = v; return s; })} />
            <Toggle label="Güncelleme" checked={g.roleGuard.update}
              onChange={(v) => patch((s) => { s.guards.roleGuard.update = v; return s; })} />

            <p className="text-sm text-gray-400 mt-4 mb-1">Kanal Guard</p>
            <Toggle label="Oluşturma" checked={g.channelGuard.create}
              onChange={(v) => patch((s) => { s.guards.channelGuard.create = v; return s; })} />
            <Toggle label="Silme" checked={g.channelGuard.delete}
              onChange={(v) => patch((s) => { s.guards.channelGuard.delete = v; return s; })} />
            <Toggle label="Güncelleme" checked={g.channelGuard.update}
              onChange={(v) => patch((s) => { s.guards.channelGuard.update = v; return s; })} />
          </div>

          <div>
            {GUARD_TOGGLES.map(([key, label]) => (
              <Toggle key={key} label={label} checked={g[key]}
                onChange={(v) => patch((s) => { s.guards[key] = v; return s; })} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Limitler (10 dakika · 0 = işlem yapılamaz)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(settings.limits).map(([key, value]) => (
            <NumberField key={key} label={EVENT_LABELS[key] || key} value={value}
              onChange={(v) => patch((s) => { s.limits[key] = v; return s; })} />
          ))}
          <NumberField label="Genel Limit (Toplam)" value={g.globalLimit}
            onChange={(v) => patch((s) => { s.guards.globalLimit = v; return s; })} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Ceza Ayarları</h3>
        <p className="text-xs text-gray-500 mb-3">Her guard olayında uygulanacak cezaları seçin (çoklu seçim).</p>
        <div className="grid md:grid-cols-2 gap-4">
          {PUNISHMENT_TYPES.map(([type, label]) => {
            const entry = settings.punishments?.[type] || {};
            const current = entry.actions?.length ? entry.actions : (entry.default || []);
            return (
              <div key={type} className="rounded-lg bg-midnight-base border border-midnight-light p-4">
                <p className="font-medium mb-2 text-sm">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {PUNISHMENT_ACTIONS.map(([action, actionLabel]) => {
                    const active = current.includes(action);
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => togglePunishment(type, action)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          active
                            ? 'bg-midnight-purple border-midnight-purple text-white'
                            : 'bg-midnight-base border-midnight-light text-gray-300 hover:bg-midnight-light'
                        }`}
                      >
                        {actionLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Spam & Reklam</h3>
        <div className="grid md:grid-cols-2 gap-x-8">
          <div>
            <Toggle label="Anti-Spam" checked={settings.antiSpam.enabled}
              onChange={(v) => patch((s) => { s.antiSpam.enabled = v; return s; })} />
            <NumberField label="Maks. uyarı" value={settings.antiSpam.maxWarnings}
              onChange={(v) => patch((s) => { s.antiSpam.maxWarnings = v; return s; })} />
            <NumberField label="Timeout (dakika)" value={Math.round((settings.antiSpam.timeoutDuration || 0) / 60000)}
              onChange={(v) => patch((s) => { s.antiSpam.timeoutDuration = v * 60000; return s; })} />
          </div>
          <div>
            <Toggle label="Anti-Reklam" checked={settings.antiAdvertisement.enabled}
              onChange={(v) => patch((s) => { s.antiAdvertisement.enabled = v; return s; })} />
            <NumberField label="Maks. uyarı" value={settings.antiAdvertisement.maxWarnings}
              onChange={(v) => patch((s) => { s.antiAdvertisement.maxWarnings = v; return s; })} />
            <NumberField label="Timeout (dakika)" value={Math.round((settings.antiAdvertisement.timeoutDuration || 0) / 60000)}
              onChange={(v) => patch((s) => { s.antiAdvertisement.timeoutDuration = v * 60000; return s; })} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Yedekleme</h3>
        <Toggle
          label="Otomatik yedekleme"
          description="Belirlenen aralıkta sunucu yedeği alınır"
          checked={settings.backup.enabled}
          onChange={(v) => patch((s) => { s.backup.enabled = v; return s; })}
        />
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <NumberField label="Yedek aralığı (saat)" value={Math.round((settings.backup.interval || 0) / 3600000)}
            onChange={(v) => patch((s) => { s.backup.interval = v * 3600000; return s; })} />
          <div>
            <span className="block text-xs text-gray-400 mb-1">Son yedek</span>
            <p className="text-sm py-2">
              {settings.backup.lastBackup
                ? new Date(settings.backup.lastBackup).toLocaleString('tr-TR')
                : 'Henüz alınmadı'}
            </p>
          </div>
        </div>
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

/* ─────────────────────────── Loglar ─────────────────────────── */
function GuardLogs({ guildId }) {
  const [logs, setLogs] = useState([]);
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [guildId, eventType]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getGuardLogs(guildId, { limit: 100, eventType: eventType || undefined });
      setLogs(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Loglar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="px-4 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
        >
          <option value="">Tüm olaylar</option>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-midnight-base hover:bg-midnight-light transition-colors">
          🔄 Yenile
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">Kayıt bulunamadı.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const status = STATUS_LABELS[log.status] || { text: log.status, color: 'text-gray-400' };
            return (
              <div key={log._id} className="p-3 rounded-lg bg-midnight-base border border-midnight-light">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{EVENT_LABELS[log.eventType] || log.eventType}</span>
                    <span className={`text-xs ${status.color}`}>{status.text}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  👤 {log.executor?.tag || log.executor?.id || 'Bilinmiyor'}
                  {log.target?.name && <> · 🎯 {log.target.name}</>}
                </div>
                {log.punishments?.length > 0 && (
                  <div className="mt-1 text-xs text-orange-400">
                    Uygulanan: {log.punishments.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Moderatörler ──────────────────────── */
function GuardModerators({ guildId }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [guildId, days]);

  const load = async () => {
    try {
      setLoading(true);
      setDetail(null);
      const res = await api.getGuardModerators(guildId, days);
      setData(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Moderatör istatistikleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (moderatorId) => {
    try {
      const res = await api.getGuardModeratorDetail(guildId, moderatorId, days);
      setDetail(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Detay yüklenemedi');
    }
  };

  const actionKeys = ['ban', 'kick', 'mute', 'jail', 'warn'];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
        >
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
          <option value={365}>Son 1 yıl</option>
        </select>
        <span className="text-sm text-gray-400">
          {data?.moderators?.length ?? 0} moderatör
        </span>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : !data?.moderators?.length ? (
        <p className="text-gray-500 py-8 text-center">Bu dönemde moderatör işlemi yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-midnight-light">
                <th className="text-left py-2 px-3">Moderatör</th>
                {actionKeys.map((k) => (
                  <th key={k} className="text-center py-2 px-3">{ACTION_LABELS[k]}</th>
                ))}
                <th className="text-center py-2 px-3">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {data.moderators.map((m) => (
                <tr
                  key={m.moderatorId}
                  onClick={() => openDetail(m.moderatorId)}
                  className="border-b border-midnight-light/50 hover:bg-midnight-base cursor-pointer"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {m.user?.avatar && <img src={m.user.avatar} className="w-6 h-6 rounded-full" alt="" />}
                      <span>{m.user?.globalName || m.user?.username || m.moderatorId}</span>
                    </div>
                  </td>
                  {actionKeys.map((k) => (
                    <td key={k} className="text-center py-2 px-3 text-gray-300">
                      {m.actions[k] || '-'}
                    </td>
                  ))}
                  <td className="text-center py-2 px-3 font-semibold text-midnight-pink">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="mt-6 p-4 rounded-lg bg-midnight-base border border-midnight-light">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">
              {detail.user?.globalName || detail.user?.username || detail.moderatorId} · {detail.total} işlem
            </h4>
            <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {detail.records.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm py-1 border-b border-midnight-light/40">
                <span className="text-midnight-pink">{ACTION_LABELS[r.action] || r.action}</span>
                <span className="text-gray-400 flex-1 truncate">
                  {r.targetId || '-'} {r.reason ? `· ${r.reason}` : ''}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(r.date).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Yedekler ─────────────────────────── */
function GuardBackups({ guildId }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getGuardBackups(guildId);
      setBackups(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Yedekler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Bu yedeği silmek istediğine emin misin?')) return;
    try {
      await api.deleteGuardBackup(guildId, id);
      setBackups((prev) => prev.filter((b) => b.id !== id));
      toast.success('Yedek silindi');
    } catch (error) {
      console.error(error);
      toast.error('Silinemedi');
    }
  };

  if (loading) return <p className="text-gray-400">Yükleniyor...</p>;
  if (backups.length === 0) return <p className="text-gray-500 py-8 text-center">Yedek bulunamadı.</p>;

  return (
    <div className="space-y-2">
      {backups.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-midnight-base border border-midnight-light">
          <div>
            <p className="font-medium">{new Date(b.backupDate).toLocaleString('tr-TR')}</p>
            <p className="text-xs text-gray-400">
              {b.roles} rol · {b.channels} kanal · {b.emojis} emoji · {b.bans} ban
            </p>
          </div>
          <button
            onClick={() => remove(b.id)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-sm"
          >
            Sil
          </button>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Komut Yetkileri ──────────────────────── */
const MODE_OPTIONS = [
  { value: 'off', label: 'Kapalı (Kısıtlama yok)' },
  { value: 'whitelist', label: 'Whitelist (Sadece izin verilenler)' },
  { value: 'blacklist', label: 'Blacklist (İzin verilenler hariç herkes)' },
];

function GuardCommandPermissions({ guildId }) {
  const [commands, setCommands] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedName, setSelectedName] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    try {
      setLoading(true);
      const [cmdRes, roleRes] = await Promise.all([
        api.getGuardCommandPermissions(guildId),
        api.getGuardRoles(guildId).catch(() => ({ data: [] })),
      ]);
      setCommands(cmdRes.data);
      setRoles(roleRes.data);
      if (cmdRes.data.length > 0) selectCommand(cmdRes.data[0]);
    } catch (error) {
      console.error(error);
      toast.error('Komut yetkileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const selectCommand = (cmd) => {
    setSelectedName(cmd.name);
    setSettings(structuredClone(cmd.settings));
    setUserResults([]);
    setUserQuery('');
  };

  const patch = (fn) =>
    setSettings((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const addToList = (field, value) => {
    if (!value) return;
    patch((s) => {
      if (!Array.isArray(s[field])) s[field] = [];
      if (!s[field].includes(value)) s[field].push(value);
    });
  };

  const removeFromList = (field, value) =>
    patch((s) => {
      s[field] = (s[field] || []).filter((v) => v !== value);
    });

  const searchUser = async () => {
    if (!userQuery.trim()) return;
    try {
      setSearching(true);
      const res = await api.getGuildMembers(guildId, { search: userQuery, limit: 10 });
      setUserResults(res.data.members || []);
    } catch (error) {
      console.error(error);
      toast.error('Kullanıcı aranamadı');
    } finally {
      setSearching(false);
    }
  };

  const save = async () => {
    if (!selectedName || !settings) return;
    try {
      setSaving(true);
      const res = await api.updateGuardCommandPermission(guildId, selectedName, settings);
      setSettings(structuredClone(res.data.settings));
      setCommands((prev) =>
        prev.map((c) => (c.name === selectedName ? { ...c, settings: res.data.settings } : c))
      );
      toast.success('Komut yetkileri kaydedildi');
    } catch (error) {
      console.error(error);
      toast.error('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!selectedName) return;
    if (!confirm(`${selectedName} komutunun yetkilerini sıfırlamak istediğine emin misin?`)) return;
    try {
      await api.resetGuardCommandPermission(guildId, selectedName);
      await load();
      toast.success('Komut yetkileri sıfırlandı');
    } catch (error) {
      console.error(error);
      toast.error('Sıfırlanamadı');
    }
  };

  if (loading) return <p className="text-gray-400">Yükleniyor...</p>;
  if (commands.length === 0) {
    return <p className="text-gray-500 py-8 text-center">Yetkilendirilebilir guard komutu bulunamadı.</p>;
  }

  const userListField = settings?.userMode === 'blacklist' ? 'blockedUsers' : 'allowedUsers';
  const roleListField = settings?.roleMode === 'blacklist' ? 'blockedRoles' : 'allowedRoles';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Guard Komutları</h3>
        <div className="space-y-1">
          {commands.map((cmd) => (
            <button
              key={cmd.name}
              onClick={() => selectCommand(cmd)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedName === cmd.name
                  ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
                  : 'bg-midnight-base hover:bg-midnight-light'
              }`}
            >
              <div className="font-medium">{cmd.name}</div>
              <div className="text-xs text-gray-400 truncate">{cmd.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!settings ? (
          <p className="text-gray-400">Bir komut seçin.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-midnight-light pb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedName}</h2>
                <p className="text-sm text-gray-400">
                  Owner ve bot sahipleri her zaman kullanabilir (değiştirilemez).
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-red-300 hover:bg-red-500/30 transition-colors text-sm"
                >
                  🔄 Sıfırla
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-midnight-purple to-midnight-pink font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-midnight-base border border-midnight-light p-4 space-y-2">
              <Toggle
                label="Komut aktif"
                description="Kapalıyken sadece owner ve bot sahipleri kullanabilir"
                checked={settings.enabled !== false}
                onChange={(v) => patch((s) => { s.enabled = v; })}
              />
              <Toggle
                label="Guard whitelist kullanıcıları kullanabilsin"
                description="Guard'da muaf/güvenli sayılan kullanıcılar bu komutu çalıştırabilir"
                checked={settings.guardWhitelistAllowed === true}
                onChange={(v) => patch((s) => { s.guardWhitelistAllowed = v; })}
              />
            </div>

            <div className="rounded-lg bg-midnight-base border border-midnight-light p-4">
              <h3 className="text-lg font-semibold mb-3">🎭 Rol Kısıtlaması</h3>
              <select
                value={settings.roleMode || 'off'}
                onChange={(e) => patch((s) => { s.roleMode = e.target.value; })}
                className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none mb-3"
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {settings.roleMode !== 'off' && (
                <>
                  <div className="flex gap-2 mb-2">
                    <select
                      value=""
                      onChange={(e) => addToList(roleListField, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
                    >
                      <option value="">Rol seçiniz</option>
                      {roles
                        .filter((r) => !(settings[roleListField] || []).includes(r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    {(settings[roleListField] || []).map((roleId) => {
                      const role = roles.find((r) => r.id === roleId);
                      return (
                        <div key={roleId} className="flex items-center justify-between rounded-lg bg-midnight-light/40 p-2">
                          <span className="flex items-center gap-2 text-sm">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: role?.hexColor || '#99AAB5' }}
                            />
                            {role?.name || roleId}
                          </span>
                          <button
                            onClick={() => removeFromList(roleListField, roleId)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                    {(settings[roleListField] || []).length === 0 && (
                      <p className="text-gray-500 text-center py-2 text-sm">Rol eklenmemiş</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg bg-midnight-base border border-midnight-light p-4">
              <h3 className="text-lg font-semibold mb-3">👤 Kullanıcı Kısıtlaması</h3>
              <select
                value={settings.userMode || 'off'}
                onChange={(e) => patch((s) => { s.userMode = e.target.value; })}
                className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none mb-3"
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {settings.userMode !== 'off' && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                      placeholder="Kullanıcı ara..."
                      className="flex-1 px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none text-sm"
                    />
                    <button
                      onClick={searchUser}
                      disabled={searching}
                      className="px-4 py-2 rounded-lg bg-midnight-purple/20 border border-midnight-purple hover:bg-midnight-purple/30 transition-colors disabled:opacity-50"
                    >
                      {searching ? '⏳' : '🔍'}
                    </button>
                  </div>

                  {userResults.length > 0 && (
                    <div className="mb-2 rounded-lg bg-midnight-light/30 border border-midnight-light p-2 max-h-[150px] overflow-y-auto">
                      {userResults.map((m) => (
                        <div
                          key={m.userId}
                          onClick={() => addToList(userListField, m.userId)}
                          className="flex items-center justify-between p-2 rounded hover:bg-midnight-light cursor-pointer"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            {m.avatar && <img src={m.avatar} alt="" className="w-6 h-6 rounded-full" />}
                            {m.username}
                          </span>
                          <span className="text-green-400 text-sm">+ Ekle</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    {(settings[userListField] || []).map((userId) => (
                      <div key={userId} className="flex items-center justify-between rounded-lg bg-midnight-light/40 p-2">
                        <code className="text-xs">{userId}</code>
                        <button
                          onClick={() => removeFromList(userListField, userId)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {(settings[userListField] || []).length === 0 && (
                      <p className="text-gray-500 text-center py-2 text-sm">Kullanıcı eklenmemiş</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── Mesaj Gönder ──────────────────────── */
function GuardMessageSender({ guildId }) {
  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState('');
  const [content, setContent] = useState('');
  const [useEmbed, setUseEmbed] = useState(false);
  const [embed, setEmbed] = useState({ title: '', description: '', color: 0x9333ea, footer: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getGuardChannels(guildId)
      .then((res) => {
        setChannels(res.data);
        setChannelId(res.data[0]?.id || '');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Kanallar yüklenemedi');
      });
  }, [guildId]);

  const send = async (e) => {
    e.preventDefault();
    if (!channelId) return toast.error('Kanal seçmelisin');
    if (!content.trim() && !useEmbed) return toast.error('Mesaj içeriği boş olamaz');

    try {
      setSending(true);
      const payload = { guildId, channelId };
      if (useEmbed) {
        payload.embed = {
          title: embed.title || undefined,
          description: embed.description || content || undefined,
          color: embed.color,
          footer: embed.footer ? { text: embed.footer } : undefined,
        };
      } else {
        payload.content = content;
      }
      const res = await api.sendGuardMessage(payload);
      toast.success(`Mesaj #${res.data.channelName} kanalına gönderildi`);
      setContent('');
      setEmbed({ title: '', description: '', color: 0x9333ea, footer: '' });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const hex = `#${(embed.color || 0).toString(16).padStart(6, '0')}`;

  return (
    <div className="max-w-3xl">
      <h3 className="text-lg font-semibold mb-4">✉️ Guard Botu ile Mesaj Gönder</h3>
      <form onSubmit={send} className="space-y-5">
        <label className="block">
          <span className="block text-sm font-medium mb-2">Kanal</span>
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none"
          >
            <option value="">Kanal seçin</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </label>

        <Toggle label="Embed olarak gönder" checked={useEmbed} onChange={setUseEmbed} />

        {useEmbed ? (
          <div className="space-y-3 rounded-lg bg-midnight-base border border-midnight-light p-4">
            <input
              type="text"
              value={embed.title}
              onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
              placeholder="Başlık"
              className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
            />
            <textarea
              value={embed.description}
              onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
              placeholder="Açıklama"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none resize-none"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Renk</span>
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setEmbed({ ...embed, color: parseInt(e.target.value.slice(1), 16) })}
                  className="w-full h-10 rounded-lg bg-midnight-base border border-midnight-light cursor-pointer"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Alt bilgi (footer)</span>
                <input
                  type="text"
                  value={embed.footer}
                  onChange={(e) => setEmbed({ ...embed, footer: e.target.value })}
                  placeholder="Footer metni"
                  className="w-full px-3 py-2 rounded-lg bg-midnight-base border border-midnight-light outline-none"
                />
              </label>
            </div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mesaj içeriği..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-midnight-base border border-midnight-light focus:border-midnight-purple outline-none resize-none"
          />
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-midnight-purple to-midnight-pink font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
}
