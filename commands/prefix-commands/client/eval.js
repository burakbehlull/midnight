import { inspect } from 'util';
import Manager from '#managers';
import config from '../../../config.json' with { type: 'json' };

const BLOCKED_MODULES = ['fs', 'child_process', 'process'];
const BLOCKED_PATTERNS = [
  /require\s*\(\s*['"]fs['"]/gi,
  /require\s*\(\s*['"]child_process['"]/gi,
  /import\s+.*\s+from\s+['"]fs['"]/gi,
  /config\.json/gi,
  /\.env/gi,
  /process\.env/gi,
  /TOKEN/gi,
  /MONGO_URI/gi,
  /GEMINI_API_KEY/gi,
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
    
    const ctrl = await manager.authority.checkIsBotOwners("909502563567677440");
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
          '❌ **Güvenlik Engeli**\n\n' +
          'Bu kod hassas bilgilere veya dosyalara erişmeye çalışıyor.\n' +
          'Engellenmiş içerik:\n' +
          '• `config.json` dosyası\n' +
          '• `.env` dosyası ve `process.env`\n' +
          '• `TOKEN`, `MONGO_URI`, `GEMINI_API_KEY`\n' +
          '• `fs`, `child_process` modülleri'
        ));
      }
    }

    const startTime = Date.now();

    try {
      const guild = message.guild;
      const channel = message.channel;
      const author = message.author;
      const member = message.member;

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
        title: '✅ Eval Başarılı',
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
