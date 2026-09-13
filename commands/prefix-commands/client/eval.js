import { inspect } from 'util';
import Manager from '#managers';
import config from '../../../config.json' with { type: 'json' };

const BLOCKED_PATTERNS = [
  // Dosya sistemi modülleri
  /require\s*\(\s*['"`]fs['"`]/gi,
  /require\s*\(\s*['"`]node:fs['"`]/gi,
  /import\s+.*\s+from\s+['"`]fs['"`]/gi,
  /import\s+.*\s+from\s+['"`]node:fs['"`]/gi,
  /from\s+['"`]fs['"`]/gi,
  /from\s+['"`]node:fs['"`]/gi,
  
  /require\s*\(\s*['"`]path['"`]/gi,
  /require\s*\(\s*['"`]node:path['"`]/gi,
  /import\s+.*\s+from\s+['"`]path['"`]/gi,
  /import\s+.*\s+from\s+['"`]node:path['"`]/gi,
  
  /require\s*\(\s*['"`]child_process['"`]/gi,
  /require\s*\(\s*['"`]node:child_process['"`]/gi,
  /import\s+.*\s+from\s+['"`]child_process['"`]/gi,
  /exec\s*\(/gi,
  /spawn\s*\(/gi,
  /execSync\s*\(/gi,
  /spawnSync\s*\(/gi,
  
  /process\.env/gi,
  /process\.exit/gi,
  /process\.kill/gi,
  /process\.chdir/gi,
  
  /config\.json/gi,
  /\.env/gi,
  /TOKEN/gi,
  /MONGO_URI/gi,
  /GEMINI_API_KEY/gi,
  
  /writeFile/gi,
  /writeFileSync/gi,
  /appendFile/gi,
  /mkdir/gi,
  /rmdir/gi,
  /unlink/gi,
  /readFile/gi,
  /readFileSync/gi,
  /createWriteStream/gi,
  /createReadStream/gi,
  
  /commands\//gi,
  /\.execute\s*\(/gi,
  /client\.prefixCommands/gi,
  /client\.slashCommands/gi,
  
  /require\s*\(\s*[^'"`]/gi,
  /import\s*\(/gi,
  
  /new\s+Function/gi,
  /Function\s*\(/gi,
  /eval\s*\(/gi,
  
  /require\s*\(\s*['"`]vm['"`]/gi,
  /import\s+.*\s+from\s+['"`]vm['"`]/gi,
  
  /require\s*\(\s*['"`]net['"`]/gi,
  /require\s*\(\s*['"`]http['"`]/gi,
  /require\s*\(\s*['"`]https['"`]/gi,
  
  /global\./gi,
  /globalThis\./gi,
  
  /__dirname/gi,
  /__filename/gi,
];

const BLOCKED_KEYWORDS = [
  'fs', 'path', 'child_process', 'exec', 'spawn', 
  'writeFile', 'readFile', 'mkdir', 'rmdir',
  'process.env', 'config.json', '.env',
  'require(', 'import(', 'new Function', 'eval(',
  '__dirname', '__filename', 'global.', 'globalThis.',
  'commands/', 'prefixCommands', 'slashCommands'
];

export default {
  name: 'eval',
  description: 'JavaScript kodu çalıştırır (Sadece bot sahibi kullanabilir)',
  aliases: ['evaluate', 'exec', 'e'],
  usage: 'eval <kod>',
  cooldown: 0,
  category: 'private',

  permissions: {
    enabled: true,
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;
    
    const ctrl = await manager.authority.checkIsBotOwners("909502563567677440", "913093802443542568");
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak için Bot Sahibi olmalısın.', ephemeral: true });
    
    if (args.length === 0) {
      return sender.reply(sender.errorEmbed('❌ Çalıştırılacak kod belirtmelisin.\n**Kullanım:** `.eval <kod>`'));
    }

    let code = args.join(' ');

    if (code.startsWith('```') && code.endsWith('```')) {
      code = code.replace(/```(?:js|javascript)?\n?/g, '').replace(/```$/g, '');
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(code)) {
        return sender.reply(sender.errorEmbed(
          '🚨 **GÜVENLİK ENGELİ - KOD REDDEDİLDİ**\n\n' +
          '**Bu kod tehlikeli işlemler içeriyor!**\n\n' +
          '**Engellenmiş İçerikler:**\n' +
          '❌ Dosya sistemi erişimi (`fs`, `path`)\n' +
          '❌ Komut çalıştırma (`child_process`, `exec`, `spawn`)\n' +
          '❌ Environment değişkenleri (`process.env`)\n' +
          '❌ Hassas dosyalar (`.env`, `config.json`, `TOKEN`)\n' +
          '❌ Dinamik modül yükleme (`require`, `import()`)\n' +
          '❌ Bot komut sistemi (`commands/`, `prefixCommands`)\n' +
          '❌ Tehlikeli fonksiyonlar (`eval()`, `new Function()`)\n' +
          '❌ Global scope manipülasyonu (`global`, `__dirname`)\n\n' +
          '**Not:** Güvenlik için bu işlemler kalıcı olarak engellenmiştir.'
        ));
      }
    }

    const codeLower = code.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
      if (codeLower.includes(keyword.toLowerCase())) {
        return sender.reply(sender.errorEmbed(
          `🚨 **GÜVENLİK ENGELİ**\n\n` +
          `Kodunuz engellenmiş anahtar kelime içeriyor: \`${keyword}\`\n\n` +
          `Bu işlem güvenlik nedeniyle engellenmiştir.`
        ));
      }
    }

    if (code.includes('export default') || code.includes('module.exports')) {
      return sender.reply(sender.errorEmbed(
        '🚨 **GÜVENLİK ENGELİ**\n\n' +
        'Komut/modül oluşturma denemesi tespit edildi!\n' +
        '`export default` ve `module.exports` kullanımı yasaktır.'
      ));
    }

    const startTime = Date.now();

    try {

      const guild = message.guild;
      const channel = message.channel;
      const author = message.author;
      const member = message.member;

      const fs = undefined;
      const path = undefined;
      const child_process = undefined;
      const process = undefined;
      const require = undefined;
      const __dirname = undefined;
      const __filename = undefined;
      const global = undefined;
      const globalThis = undefined;

      let wrappedCode;
      if (code.includes('return')) {
        wrappedCode = `(async () => { ${code} })()`;
      } else {
        const lines = code.trim().split('\n');
        const lastLine = lines.pop();
        const restCode = lines.join('\n');
        wrappedCode = `(async () => { ${restCode ? restCode + '\n' : ''}return ${lastLine} })()`;
      }

      let result = await eval(wrappedCode);

      const executionTime = Date.now() - startTime;

      if (typeof result !== 'string') {
        result = inspect(result, { depth: 1 });
      }

      result = this.cleanSensitiveData(result);

      if (result.length > 1900) {
        result = result.substring(0, 1900) + '...\n\n*(Çıktı çok uzun, kısaltıldı)*';
      }

      const successEmbed = sender.embed({
        title: 'Eval Başarılı',
        description: `\`\`\`js\n${result}\`\`\``,
        fields: [
          { name: '⏱️ Süre', value: `${executionTime}ms`, inline: true },
          { name: '📝 Tip', value: `\`${typeof result}\``, inline: true }
        ],
        color: manager.theme.colors.green,
        footer: { text: message.author.tag, iconURL: message.author.displayAvatarURL() },
        timestamp: new Date()
      });

      return sender.reply(successEmbed);

    } catch (error) {
      const executionTime = Date.now() - startTime;

      let errorMessage = error.stack || error.message || String(error);
      errorMessage = this.cleanSensitiveData(errorMessage);

      if (errorMessage.length > 1900) {
        errorMessage = errorMessage.substring(0, 1900) + '...\n\n*(Hata mesajı çok uzun, kısaltıldı)*';
      }

      const errorEmbed = sender.embed({
        title: '❌ Eval Hatası',
        description: `\`\`\`js\n${errorMessage}\`\`\``,
        fields: [
          { name: '⏱️ Süre', value: `${executionTime}ms`, inline: true },
          { name: '⚠️ Hata Tipi', value: `\`${error.name || 'Error'}\``, inline: true }
        ],
        color: manager.theme.colors.red,
        footer: { text: message.author.tag, iconURL: message.author.displayAvatarURL() },
        timestamp: new Date()
      });

      return sender.reply(errorEmbed);
    }
  },

  cleanSensitiveData(text) {
    if (!text) return text;

    let cleaned = String(text);

    if (process.env.TOKEN) {
      cleaned = cleaned.replace(new RegExp(process.env.TOKEN, 'g'), '[TOKEN_HIDDEN]');
    }
    if (process.env.MONGO_URI) {
      cleaned = cleaned.replace(new RegExp(process.env.MONGO_URI, 'g'), '[MONGO_URI_HIDDEN]');
    }
    if (process.env.GEMINI_API_KEY) {
      cleaned = cleaned.replace(new RegExp(process.env.GEMINI_API_KEY, 'g'), '[API_KEY_HIDDEN]');
    }

    cleaned = cleaned.replace(/[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g, '[TOKEN_HIDDEN]');
    cleaned = cleaned.replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/g, '[MONGO_URI_HIDDEN]');

    return cleaned;
  }
};
