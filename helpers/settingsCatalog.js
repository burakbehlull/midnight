export const SETTING_PAGES = {
  server: {
    id: 'server',
    emoji: '☀️',
    label: 'Sunucu Ayarları',
    short: 'Prefix, tag, kayıt düzeni ve sistemler',
    title: '☀️ Sunucu Ayarları',
    description: 'Prefix, tag, kayıt düzeni ve sistemlerin aç/kapat durumları.',
    slots: [
      { key: 'prefix', label: 'Prefix', type: 'text', source: 'settings', description: 'Komut öneki (ör. ! veya .)' },
      { key: 'tag', label: 'Tag', type: 'text', source: 'settings', description: 'Sunucu tag metni' },
      {
        key: 'registerFormat', label: 'Kayıt Formatı', type: 'choice', source: 'settings',
        description: 'Kayıtta isim nasıl düzenlensin',
        choices: [
          { label: 'Hiçbiri (isim değişmez, sadece rol)', value: 'none' },
          { label: 'İsim Yaş (Ahmet | 18)', value: 'isim_yas' },
          { label: 'Tag İsim Yaş (✦ Ahmet I 18)', value: 'tag_isim_yas' },
          { label: 'İsim (Ahmet)', value: 'isim' },
          { label: 'Tag İsim (✦ Ahmet)', value: 'tag_isim' }
        ]
      },
      {
        key: 'registerMode', label: 'Kayıt Modu', type: 'choice', source: 'settings',
        description: 'Cinsiyet rolleri mi tek rol mü',
        choices: [
          { label: 'Cinsiyet Rolleri (Erkek / Kız)', value: 'gender' },
          { label: 'Tek Rol (tek buton)', value: 'single' }
        ]
      },
      { key: 'otorolStatus', label: 'Otorol Sistemi', type: 'toggle', source: 'settings', description: 'Yeni üyeye otomatik rol verir' },
      { key: 'inviteLogStatus', label: 'Davet Log Sistemi', type: 'toggle', source: 'settings', description: 'Davet giriş/çıkış logu' },
      { key: 'levelSystemStatus', label: 'Seviye Sistemi', type: 'toggle', source: 'settings', description: 'Mesaj bazlı seviye sistemi' },
      { key: 'statSystemStatus', label: 'Stat Sistemi', type: 'toggle', source: 'settings', description: 'Mesaj/ses istatistikleri' },
      { key: 'tagRoleStatus', label: 'Tag Role Sistemi', type: 'toggle', source: 'settings', description: 'Tag alanlara rol verir' },
      { key: 'spotifyMatchEnabled', label: 'Spotify Eşleşme Sistemi', type: 'toggle', source: 'settings', description: 'Spotify eşleşme özelliği' }
    ]
  },

  roles: {
    id: 'roles',
    emoji: '🎭',
    label: 'Roller & Kanallar',
    short: 'Rol ve kanal atamaları',
    title: '🎭 Roller & Kanallar',
    description: 'Sunucudaki rol ve kanal atamalarını düzenle.',
    slots: [
      { key: 'vipRoleId', label: 'Vip Rolü', type: 'role', source: 'settings', description: 'Vip rolü' },
      { key: 'photoRoleId', label: 'Photo Rolü', type: 'role', source: 'settings', description: 'Fotoğraf izni rolü' },
      { key: 'streamerRoleId', label: 'Streamer Rolü', type: 'role', source: 'settings', description: 'Yayıncı rolü' },
      { key: 'erkekRoleId', label: 'Erkek Kayıt Rolü', type: 'role', source: 'settings', description: 'Kayıtta verilecek erkek rolü' },
      { key: 'kizRoleId', label: 'Kız Kayıt Rolü', type: 'role', source: 'settings', description: 'Kayıtta verilecek kız rolü' },
      { key: 'kayitsizRoleId', label: 'Kayıtsız Rolü', type: 'role', source: 'settings', description: 'Kayıtsız üyelere verilen rol' },
      { key: 'singleRegisterRoleId', label: 'Tek Kayıt Rolü', type: 'role', source: 'settings', description: 'Tek rol modunda verilecek rol' },
      { key: 'staffRole', label: 'Yetkili Rolü', type: 'role', source: 'settings', description: 'Yetkili ekibi rolü' },
      { key: 'jailRoleId', label: 'Jail Rolü', type: 'role', source: 'settings', description: 'Cezalı rolü' },
      { key: 'autoRoleId', label: 'Otorol Rolü', type: 'role', source: 'settings', description: 'Yeni üyeye verilecek rol' },
      { key: 'tagRoleId', label: 'Tag Role', type: 'role', source: 'settings', description: 'Tag alanlara verilecek rol' },
      { key: 'inviteLogChannelId', label: 'Davet Log Kanalı', type: 'channel', source: 'settings', description: 'Davet kayıtlarının atılacağı kanal' },
      { key: 'spotifyMatchChannelId', label: 'Spotify Eşleşme Kanalı', type: 'channel', source: 'settings', description: 'Eşleşme mesajlarının atılacağı kanal' }
    ]
  },

  modlog: {
    id: 'modlog',
    emoji: '📜',
    label: 'Mod Log',
    short: 'Log kanalları ve durumu',
    title: '📜 Mod Log',
    description: 'Log sistemini ve log kanallarını yönet.',
    slots: [
      { key: 'modLogStatus', label: 'Log Sistemi', type: 'toggle', source: 'modlog', description: 'Log gönderimi açık/kapalı' },
      { key: 'generalLogChannel', label: 'Genel Log Kanalı', type: 'channel', source: 'modlog', description: 'Tip kanalı yoksa buraya düşer' },
      { key: 'logs.command', label: 'Komut Log Kanalı', type: 'channel', source: 'modlog', description: 'Komut kullanım logu' },
      { key: 'logs.joinLeave', label: 'Katıl/Çık Log Kanalı', type: 'channel', source: 'modlog', description: 'Üye giriş/çıkış logu' },
      { key: 'logs.message', label: 'Mesaj Log Kanalı', type: 'channel', source: 'modlog', description: 'Mesaj düzenle/sil logu' },
      { key: 'logs.voice', label: 'Ses Log Kanalı', type: 'channel', source: 'modlog', description: 'Ses kanalı logu' },
      { key: 'logs.kickBan', label: 'Kick/Ban Log Kanalı', type: 'channel', source: 'modlog', description: 'Atma/yasaklama logu' },
      { key: 'logs.role', label: 'Rol Log Kanalı', type: 'channel', source: 'modlog', description: 'Rol değişim logu' },
      { key: 'logs.channel', label: 'Kanal Log Kanalı', type: 'channel', source: 'modlog', description: 'Kanal değişim logu' },
      { key: 'logs.moderation', label: 'Moderasyon Log Kanalı', type: 'channel', source: 'modlog', description: 'Moderasyon işlem logu' }
    ]
  }
};

export function findSlot(pageId, key) {
  const page = SETTING_PAGES[pageId];
  if (!page) return null;
  return page.slots.find(s => s.key === key) || null;
}
