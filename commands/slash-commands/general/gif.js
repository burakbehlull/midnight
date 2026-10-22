import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';
import sharp from 'sharp';
import gifenc from 'gifenc';
import Manager from '#managers';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const MAX_SIDE = 1280;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const PALETTE_SIZE = 256;
const BACKDROP = '#111318';
const FILE_NAME = 'midnight.gif';

function isImageAttachment(attachment) {
  if (attachment?.contentType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif|tiff?)$/i.test(attachment?.name ?? '');
}

function fmtMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function downloadAttachment(url) {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.arrayBuffer().catch(() => null);
  return data ? Buffer.from(data) : null;
}

// Fotoğrafı olduğu gibi (efekt yok) GIF'e çevirir
async function encodeGif(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { animated: false })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: BACKDROP })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const palette = quantize(data, PALETTE_SIZE, { format: 'rgb565' });
  const index = applyPalette(data, palette, 'rgb565');

  const gif = GIFEncoder();
  gif.writeFrame(index, info.width, info.height, { palette, delay: 0, repeat: -1 });
  gif.finish();

  return { buffer: Buffer.from(gif.bytes()), width: info.width, height: info.height };
}

export default {
  name: 'gif',
  description: 'Yüklediğin fotoğrafı GIF dosyasına çevirir.',
  usage: '/gif fotograf:<dosya>',
  category: 'general',
  permissions: { enabled: false },
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName('gif')
    .setDescription('Yüklediğin fotoğrafı GIF dosyasına çevirir.')
    .addAttachmentOption((opt) =>
      opt
        .setName('fotograf')
        .setDescription('GIF haline getirilecek fotoğraf')
        .setRequired(true)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),

  async execute(client, interaction) {
    const manager = new Manager(client, { action: interaction });

    const fail = async (message) => {
      const payload = { embeds: [manager.sender.errorEmbed(message)] };
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload).catch(() => null);
      }
      return interaction.reply(payload).catch(() => null);
    };

    const attachment = interaction.options?.getAttachment?.('fotograf') ?? null;

    if (!attachment) return fail('❌ Bir fotoğraf yüklemelisin.');
    if (!isImageAttachment(attachment)) {
      return fail('❌ Sadece görsel dosyaları desteklenir (`png`, `jpg`, `webp`, `gif` vb.).');
    }
    if (attachment.size > MAX_INPUT_BYTES) {
      return fail(`❌ Fotoğraf çok büyük (${fmtMb(attachment.size)}). En fazla ${fmtMb(MAX_INPUT_BYTES)} olabilir.`);
    }

    await interaction.deferReply();

    try {
      const inputBuffer = await downloadAttachment(attachment.url);
      if (!inputBuffer) return fail('❌ Fotoğraf indirilemedi, tekrar deneyin.');

      const { buffer, width, height } = await encodeGif(inputBuffer).catch(() => ({}));
      if (!buffer) return fail('❌ Bu dosya bir fotoğraf olarak okunamadı.');
      if (buffer.length > MAX_OUTPUT_BYTES) {
        return fail('❌ GIF çok büyük oldu, daha küçük bir fotoğraf deneyin.');
      }

      const embed = manager.sender.embed({
        color: manager.sender.colors.purple,
        title: 'Fotoğrafın GIF hali hazır',
        description: [
          `**Dosya:** \`${attachment.name}\``,
          `**Boyut:** ${width}×${height} px`,
          `**Çıktı:** \`${FILE_NAME}\` (${fmtMb(buffer.length)})`,
        ].join('\n'),
        image: `attachment://${FILE_NAME}`,
        footer: { text: `${interaction.user.username} • /gif` },
      });

      return await interaction.editReply({
        embeds: [embed],
        files: [new AttachmentBuilder(buffer, { name: FILE_NAME })],
      }).catch(() => fail('❌ GIF gönderilemedi, tekrar deneyin.'));
    } catch (error) {
      console.error('[gif slash error]', error);
      return fail('❌ GIF oluşturulurken beklenmedik bir hata oluştu.');
    }
  },
};
