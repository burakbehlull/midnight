import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import Manager from '#managers';

export default {
    name: "ship",
    usage: "ship / ship @kullanıcı / ship @kullanıcı1 @kullanıcı2",
    aliases: ["ships"],
    description: 'Ship yapma komutu',
    category: "fun",
    
    permissions: {
        enabled: false
    },

    execute: async (client, message, args) => {
        const manager = new Manager(client, { action: message });
        
        const mentions = message.mentions.members.filter(m => !m.user.bot);
        
        let user1, user2;

        if (mentions.size === 0) {
            user1 = message.member;
            
            const availableMembers = message.guild.members.cache.filter(m => 
                !m.user.bot && m.id !== message.author.id
            );
            
            if (availableMembers.size === 0) {
                return manager.sender.reply(manager.sender.errorEmbed("Sunucuda ship yapacak başka kimse yok!"))
                    .then(msg => setTimeout(() => msg.delete(), 5000));
            }
            
            user2 = availableMembers.random();
            
        } else if (mentions.size === 1) {
            const mentionedUser = mentions.first();
            
            if (mentionedUser.id === message.author.id) {
                return manager.sender.reply(manager.sender.errorEmbed("Kendini ship edemezsin!"))
                    .then(msg => setTimeout(() => msg.delete(), 5000));
            }
            
            user1 = message.member;
            user2 = mentionedUser;
            
        } else if (mentions.size >= 2) {
            const mentionsArray = Array.from(mentions.values());
            user1 = mentionsArray[0];
            user2 = mentionsArray[1];
            
            if (user1.id === user2.id) {
                return manager.sender.reply(manager.sender.errorEmbed("Aynı kişiyi ship edemezsin!"))
                    .then(msg => setTimeout(() => msg.delete(), 5000));
            }
        }

        const lovePercentage = Math.floor(Math.random() * 101);
        
        const THEMES = [
            {
                name: 'Kırmızı',
                weight: 60,
                colors: {
                    bg: '#ffe5e5',
                    polaroidBorder: '#f4d4d4',
                    username: '#e59b9b',
                    heartFill: '#ff4b4b',
                    circle: '#f6d5d5',
                    tape: '#fcd4d4',
                    tapePattern: '#ee9f9f'
                }
            },
            {
                name: 'Şeker',
                weight: 20,
                colors: {
                    bg: '#f5e5ee',
                    polaroidBorder: '#f4dbe4',
                    username: '#e59bb2',
                    heartFill: '#ff4b8b',
                    circle: '#f6d5e3',
                    tape: '#fce2c4',
                    tapePattern: '#eec59f'
                }
            },
            {
                name: 'Lavanta',
                weight: 10,
                colors: {
                    bg: '#fdf0f5',
                    polaroidBorder: '#e8e8ff',
                    username: '#9b9be5',
                    heartFill: '#b19cd9',
                    circle: '#c3b1e1',
                    tape: '#e8e8ff',
                    tapePattern: '#9b9be5'
                }
            },
            {
                name: 'Mint',
                weight: 3,
                colors: {
                    bg: '#e5f5f0',
                    polaroidBorder: '#d4f4e8',
                    username: '#9be5c8',
                    heartFill: '#4bffb6',
                    circle: '#d5f6e9',
                    tape: '#d4fce2',
                    tapePattern: '#9feecc'
                }
            },
            {
                name: 'Vanilya',
                weight: 2,
                colors: {
                    bg: '#fdf0f5',
                    polaroidBorder: '#fef5e7',
                    username: '#e5c185',
                    heartFill: '#f4a261',
                    circle: '#f4d1a1',
                    tape: '#fef5e7',
                    tapePattern: '#e5c185'
                }
            },
            {
                name: 'Sarı',
                weight: 2,
                colors: {
                    bg: '#fff9e5',
                    polaroidBorder: '#f4f0d4',
                    username: '#e5d89b',
                    heartFill: '#ffdd4b',
                    circle: '#f6f2d5',
                    tape: '#fcf8c4',
                    tapePattern: '#eee89f'
                }
            }
        ];

        const totalWeight = THEMES.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedTheme = THEMES[0];

        for (const t of THEMES) {
            if (random < t.weight) {
                selectedTheme = t;
                break;
            }
            random -= t.weight;
        }

        const theme = selectedTheme.name;
        const colors = selectedTheme.colors;

        try {
            const canvas = createCanvas(1024, 500);
            const ctx = canvas.getContext('2d');

            
            ctx.fillStyle = colors.bg;
            ctx.fillRect(0, 0, 1024, 500);

            
            let title;
            if (lovePercentage >= 80) {
                title = 'BÜYÜK AŞK';
            } else if (lovePercentage >= 50) {
                title = 'AŞK';
            } else {
                title = 'SİZDEN OLMAZ';
            }

            ctx.fillStyle = '#4a4a4a';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, 512, 50);

            await drawPolaroid(
                ctx, 
                user1.user.displayAvatarURL({ extension: 'png', size: 256 }), 
                80, 70, 
                user1.user.username, 
                -4,
                colors
            );

            await drawPolaroid(
                ctx, 
                user2.user.displayAvatarURL({ extension: 'png', size: 256 }), 
                660, 70, 
                user2.user.username, 
                4,
                colors
            );

            drawLoveCenter(ctx, 500, 220, lovePercentage, colors);


            ctx.fillStyle = '#555555';
            ctx.font = 'bold 20px "Times New Roman", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${theme}`, 500, 425);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'ship.png' });

            message.reply({
                content: `**${user1.user.username}** & **${user2.user.username}** ${lovePercentage >= 50 ? '❤️' : '💔'}`,
                files: [attachment]
            });

        } catch (error) {
            console.error('[ship] Canvas hatası:', error);
            manager.sender.reply(manager.sender.errorEmbed('❌ Ship oluşturulurken hata oluştu!'));
        }
    }
};

async function drawPolaroid(ctx, avatarURL, x, y, username, rotation, colors) {
    ctx.save();
    

    ctx.translate(x + 130, y + 160);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-(x + 130), -(y + 160));

    const frameWidth = 260;
    const frameHeight = 310;


    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, frameWidth, frameHeight);
    

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = colors.polaroidBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, frameWidth, frameHeight);


    try {
        const avatar = await loadImage(avatarURL);
        ctx.drawImage(avatar, x + 15, y + 15, 230, 230);
    } catch (error) {
        ctx.fillStyle = '#eee';
        ctx.fillRect(x + 15, y + 15, 230, 230);
    }


    ctx.fillStyle = colors.username;
    ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    

    let formattedName = username;
    if (formattedName.length > 15) formattedName = formattedName.substring(0, 13) + '..';
    ctx.fillText(formattedName, x + 130, y + 283);


    const tapeWidth = 100;
    const tapeHeight = 22;
    const tapeX = x + (frameWidth - tapeWidth) / 2;
    const tapeY = y - 10;

    ctx.fillStyle = colors.tape;
    ctx.fillRect(tapeX, tapeY, tapeWidth, tapeHeight);


    ctx.strokeStyle = colors.tapePattern;
    ctx.lineWidth = 1.5;
    for (let i = tapeX + 8; i < tapeX + tapeWidth - 4; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, tapeY + 2);
        ctx.lineTo(i + 4, tapeY + tapeHeight - 2);
        ctx.stroke();
    }

    ctx.restore();
}


function drawLoveCenter(ctx, x, y, percentage, colors) {
    ctx.save();


    ctx.strokeStyle = colors.circle;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(x, y, 105, 0, Math.PI * 2);
    ctx.stroke();

    drawSparkle(ctx, x + 98, y - 45, 6);
    drawSparkle(ctx, x - 102, y + 35, 5);

    const heartScale = 1.05;
    const heartYOffset = y - 85;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    createHeartPath(ctx, x, heartYOffset, heartScale);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    createHeartPath(ctx, x, heartYOffset, heartScale);
    ctx.clip(); 

    const totalHeartHeight = 160;
    const fillHeight = (percentage / 100) * totalHeartHeight;
    const fillY = (heartYOffset + 140) - fillHeight;

    ctx.fillStyle = colors.heartFill;
    ctx.fillRect(x - 120, fillY, 240, fillHeight + 30);
    ctx.restore();

    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 50px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`%${percentage}`, x, y + 5);

    ctx.restore();
}

function createHeartPath(ctx, x, y, scale) {
    ctx.moveTo(x, y + 35 * scale);
    ctx.bezierCurveTo(x, y + 30 * scale, x - 10 * scale, y, x - 45 * scale, y);
    ctx.bezierCurveTo(x - 85 * scale, y, x - 85 * scale, y + 45 * scale, x - 85 * scale, y + 45 * scale);
    ctx.bezierCurveTo(x - 85 * scale, y + 80 * scale, x - 45 * scale, y + 115 * scale, x, y + 140 * scale);
    ctx.bezierCurveTo(x + 45 * scale, y + 115 * scale, x + 85 * scale, y + 80 * scale, x + 85 * scale, y + 45 * scale);
    ctx.bezierCurveTo(x + 85 * scale, y + 45 * scale, x + 85 * scale, y, x + 45 * scale, y);
    ctx.bezierCurveTo(x + 15 * scale, y, x, y + 30 * scale, x, y + 35 * scale);
}

function drawSparkle(ctx, cx, cy, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}