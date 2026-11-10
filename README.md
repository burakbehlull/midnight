# Midnight
Server Public bot built with Discord v14 version, integrated with slash and prefix commands

` node version: 22.20.0 `

## Usage:

Operating path:

**Libs install**  : ` npm start `

**Slash commands load**  : ` npm start `

**Start command** : ` npm start `

**Bot and web panel start command** : ` npm run all `

To enter bot settings, create an .env file, there is an example ` .env ` file named **.env-example** in the project.

```
MONGO_URI = 
GEMINI_API_KEY = 

// MOD 
TOKEN = 
BOT_ID = 
PREFIX = .

// GUARD
GUARD_TOKEN = 
GUARD_BOT_ID = 
GUARD_PREFIX = 
```

Create ` config.json ` file and set permission settings:
```json
{
    "BOT_OWNER_IDS": [], // safe bot owner ids
    "DEVELOPMENT_MODE": false,
    "AUTO_SLASH_COMMAND_DEPLOY": false,

    "ACTIVITY_NAME": "only Miguel",
	"ACTIVITY_TYPE": 3,
	"ACTIVITY_STATUS": "idle",


    "AI": {
		"ReplyCommand": true, // .ai Hello!
		"ReplyWrapper": false // @reply Hello!
	}
}
```

### contents: Bot Commands
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **yaz** | This command allows you to write from the bot | text | stable |
| **client-load** | Client emoji load | emoji, emoji name | stable |
| **client-list** | Client emoji load | emoji | stable |
| **eval** | command test | text | stable |

### contents: General User
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **help** | helps user | .. | un-stable |
| **ai** | chat with ai | message | stable |
| **pull** | Pulls the tagged user | user | stable |
| **where** | Show your user | user | stable |
| **go** | Goes to the user you were tagged in | user | stable |
| **afk** | AFK mode | reason | stable |
| **avatar** | Shows user avatar | user | stable |
| **server-avatar** | gets server avatar | .. | stable |
| **server-banner** | gets server banner | .. | stable |
| **device** | Shows user device | user | stable |
| **use** | Spotify, etc.. theme change | spotify, item | stable |
| **gif** | Converts the uploaded photo into a GIF (works in DM and guilds) | attachment | stable |


### contents: Mod
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **ban** | Ban the user | user -ticket, id- | stable |
| **unban** | Unban the user | user id | stable |
| **forceban** | Force ban the user | user id | stable |
| **unforceban** | Unforceban the user | user id | stable |
| **godban** | Banning from shared servers | user or user id | stable |
| **ungodban** | Unbanning from shared servers | user or user id | stable |
| **ban-list** | Ban list | user id | stable |
| **kick** | Kick the user | user -ticket, id- | stable |
| **mass-ban** | Mass ban users | users | stable |
| **unmass-ban** | Mass unban users | users | stable |
| **vmute** | Throws voice mute on tagged user | user, second -exp. 10m -, reason | stable |
| **vunmute** | Unmute | user, reason | stable |
| **mute** | Throws chat mute on tagged user | user, reason | stable |
| **unmute** | user unmute for chat | user, reason | stable |
| **nuke** | Refreshes the channel | channel | stable |
| **snipe** |  Shows last deleted message | .. | stable |
| **punish-info** |  Show user punish info | punish id | stable |
| **lock** | lock to Chat | .. | stable |
| **allvmute** | Mutes all user in channel | channel | stable |
| **allvunmute** | Unmutes all user in channel | channel | stable |
| **timeout** | Add emoji to guilds | user, time | stable |
| **untimeout** | removes user timeout | user | stable |
| **addemoji** | Add emoji to guilds | emoji or url, name | stable |
| **role** | Gives and takes the user | user, role | stable |
| **clear** | Deletes messages | amount | stable |
| **streamer** | Gives streamer role | user | stable |
| **vip** | Gives vip role | user | stable |
| **photo** | Gives photo role | user | stable |
| **tag** | Sets the server tag | .. | stable |
| **sesgir** | Join voice channel | channelId | stable |
| **sescik** | Leave voice channel | .. | stable |
| **say** | Guild information | ... | stable |
| **nick** | Change user, user nick name history | user, name | stable |
| **rollog** | Show user roles history | user | stable |
| **actions** | Show actions groups | show, create, delete, remove | stable |


### contents: Staff
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **active-penalties** | show user active penalties | user | stable |
| **tasks** | staff tasks | me, user | stable |
| **authority** | take and pull staff  | user | stable |
| **yetkililerim** | staffs of moderation user  | .. | stable |
| **topyetkili** | top staff  | .. | stable |
| **punish** | user gives punish  | user, reason | stable |
| **warn** | user gives warn  | user, reason | stable |
| **jail** | user gives jail  | user, duration, reason | stable |
| **unjail** | user unjail  | user | stable |
| **record** | record of user | user | stable |
| **register** | Saves the user you tagged in | user, name, age | stable |
| **unregistered** | Gives the user | user | stable |

### contents: Stat and Level, Invite
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **top** | shows server top stats, levels, invites | .. | stable |
| **stat** | shows user statics, level, invites | self, user | stable |

### contents: Setting and Setup
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **commandpanel** | authority ones command systems | .. | stable |
| **customcommand** | create custom command | add, edit, delete | stable |
| **ticket-setup** | creates embed tickets | .. | stable |
| **room-setup** | private room creater | .. | stable |
| **confession-setup** | people are open or anonymous confessors | channel | stable |
| **booster-panel-setup** | booster is special feature | .. | stable |
| **self-register-setup** | register embed | .. | stable |


### contents: Economy
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **shop** | shop marketplace | .. | stable |
| **cash** | users cash | .. | stable |
| **cookie** | users give to cookie daily | user | stable |
| **buy** | buy item | item id | stable |
| **sell** | sell item | item id, amount | stable |
| **daily** | daily moeny | .. | stable |
| **heart** | users give to heart daily | .. | stable |
| **send** | users send money | user, money | stable |
| **envanter** | users envanter | .. | stable |
| **kripto** | crypto/stock exchange (prices, buy/sell, portfolio, history) | .. | stable |
| **bank** | bank panel: bank picker (registered banks listed first), demand deposit/withdraw, term deposit (7/14/21/30-day buttons with payout preview), loans (daily interest, overdue x4), per-user history; `.bank` starts a bank setup request | bank name (when opening) | stable |
| **mybank** | your registered accounts + the bank you manage (CEO/partner); "Bankamı Yönet" opens the management panel (status, deposits/loans, account balances, adjustable rates) | .. | stable |

### contents: Social
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **profile** | users profile | .. | stable |
| **family** | show family | .. | stable |
| **marry** | users marries | user, ring item id | stable |
| **divorce** | user divorce | .. | stable |
| **fosterling** | adoption order | user | stable |
| **fosterleave** | user leave | .. | stable |
| **fosterdismiss** | kick user | user | stable |

### contents: Fun and Game
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **gamestat** | user and top stats | me, user | stable |
| **spotify** | .. | me, user | stable |
| **pet** | adopt pet | self, adopt, love, heal, play, sleep, name, feed, leaderboard | stable |
| **game** | shows the game the user is currently playing as a card (icon, game name, playtime) | me, user | stable |
| **ship** | ships | random or user and second user | stable |
| **nickship** | ships | random or user and second user | stable |
| **slot** | game | bet amount | stable |
| **rulet** | shows server rules  | user, bet amount | stable |
| **xox** | shows server rules  | user, bet amount | stable |
| **wordgame** | two user bet game 1 and 2 word letter mode | user, bet amount | stable |
| **wordbuilding** | word-building game | channel | stable |
| **wordbomb** | word bomb duel (type a valid word starting with the given syllable, pass the bomb) | user and bet amount | stable |
| **gofishing** | take fish | bet amount (1 userly), user and bet amount (userly) | stable |
| **blackjack** | blackjack | bet amount | stable |
| **mines** | mines game | bet amount | stable |
| **scratchcard** | scratchcard game | bet amount | stable |
| **wheel** | wheel game | bet amount | stable |
| **dice** | dice duel (7 over/under single, higher roll wins PvP) | bet amount and over/under (1 userly), user and bet amount (userly) | stable |
| **hilo** | predict whether the next card will be high or low | bet amount | stable |
| **bingo** | bingo / tombola (1-90 drawn, system rolls a random 3x3 card shown as buttons, optional "Sayı Gir" button to enter your own numbers, first to complete a line takes the pot) | bet amount | stable |
| **keno** | keno (pick 10 of 1-80, system draws 20) | bet amount and 10 numbers, or "rastgele" | stable |
| **kiss** | kiss user | user | stable |
| **slap** | slaps user | user | stable |
| **hug** | hugs user | user | stable |
| **fuck** | fxck user | user | stable |




### events:
| feature | comment | set command |
| ------ | ------ | ------ | 
| otorole | Gives automatic roles to users | Can be set with the /settings Auto Role command |
| spotify-match | Creates a Spotify match card for users in the server. | Can be set with the /settings Spotify Match command |

**libs** uses:
| Helper | Comment | Use | 
| -------- | -------- | -------- | 
| themeBuilder | A newer and more colorful message enrichment class than Message Sender. | new themeBuilder() | 
| Core | The bot's framework—including various command and event-handling snippets, as well as the deploy commands—is located here. | new Core() | 


**Permission Manager** functions and uses:
| Function | Values | Use | 
| -------- | -------- | -------- | 
| .control() | Checks the permissions and returns true accordingly. | .control(...flags) | 
| .isOwners() | .. | Returns true if there is an id equal to the specified id. | 
| .isRoles() | ... | Returns true if there is an id equal to the specified id. | 
| .isAuthority() | authorities | .isAuthority(userId, new PermissionManager().flags.Administrator) | 
| .isGuildOwner() | .. | Returns true if the user using the command is the owner. PM.isGuildOwner() | 
| .selectOwnerIds() | ..userIds | Returns true if the user using the command is the users. PM.selectOwnerIds(userId) | 
|
**helpers** functions and uses:
| Helper | Comment | Use | 
| -------- | -------- | -------- | 
| utils | You can handle fetching a user or channel with a single function within the `utils` class. | new Utils() | 
| messageSender | Helps with responsiveness and rich embed creation | new messageSender() | 
| loaders | This file contains the commands, events, and deployment code. Everything is modular. | new messageSender() | 
| misc | Contains many auxiliary functions | misc.callFunction() | 
| components | A class that makes the components offered by Discord Js more useful | new Button(), new Modal() | 


### Authority command inside object keys
```json
permissions: {
    enabled: true // default true
    authorities: [],
    user: [],
    roles: []
}
```

### Easy access through shared use: Manager class
```js
import Manager from '#managers';

const manager = new Manager(client, { action: interaction || message  })

await manager.authority() // Access to permissionManager class
await manager.authority.control() // Access to permissionManager class
await manager.authority.flags() // Access to permissionManager class to FLAGS


await manager.theme.embedThemeBuilder() // Access to themeBuilder
await manager.sender.reply() // Access to messageSender


await manager.utils // Access to utils class

await manager.theme.themes // Access to themes
await manager.theme.colors // Access to colors

await manager.audit // Access to AuditLogEvents

await manager.config // Access to config.json


const manager = new Manager(
    client, 
    {   
        action: interaction || message, 
        authority: { action: // It can also take action internally, in a specific way. }, 
        theme: {}, 
        utils: {}, 
        sender: {}  
    }
)
```

### Example theme builder class: themeBuilder
```js
import { themeBuilder } from '#libs'
import { themes } from '#data'

const tb = new themeBuilder(unkown) // interaction || message

const theme = tb.embedThemeBuilder(themes.success, {
  action: false,
  author: tb.getNameAndAvatars("guild"),
  description: "example",
  footer: tb.getNameAndAvatars("user")
})

tb.send({embed: theme, id: "channel id"})

tb.send({embed: theme, reply: true}) // reaction: reply
tb.send({embed: theme}) // reaction: message in channel

// action is true
theme.reply() 
theme.send()
```

### Example theme builder class: messageSender
```js
import { messageSender } from '#helpers'

const sender = new messageSender(unkown); // interaction || message

sender.embed({
    title, 
    description, 
    image, 
    thumbnail, 
    fields, 
    author, 
    color, 
    footer, 
    timestamp
})

sender.classic(text)
sender.errorEmbed(text)

sender.send()
sender.send(embed, channelId, components)

sender.reply(content, userSees, components)
sender.reply()

```

## 🛡️ Guard Bot System

**Midnight Guard** is a powerful security bot that protects your Discord server from unauthorized actions. It runs separately alongside the main bot to provide comprehensive server protection.

### Features:
- **Role Protection**: Prevents unauthorized role creation, deletion, and modifications
- **Channel Protection**: Guards against channel manipulation (create, delete, update)
- **Ban/Kick Protection**: Monitors and prevents mass bans and kicks
- **Bot Protection**: Controls which bots can be added to the server
- **Vanity URL Protection**: Prevents vanity URL changes
- **Anti-Spam**: Detects and punishes spammers
- **Anti-Advertisement**: Blocks advertisement messages
- **Backup System**: Automatic server backups with configurable intervals
- **Whitelist System**: Safe users, roles, and bots bypass all restrictions
- **Smart Punishment**: Configurable actions (jail, kick, ban) for violations
- **Detailed Logging**: Comprehensive audit logs for all guard actions

### Guard Commands:
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **guard-panel** | Opens the comprehensive guard control panel | .. | stable |
| **yt** | Lock/unlock server permissions (role management) | .. | stable |
| **backup** | Server backup operations (create, load, list) | action, backup id | stable |
| **guard-user-info** | Shows user's guard profile and violations | user | stable |

### Guard Protection Types:
- **Role Guard**: Create, Delete, Update protection
- **Channel Guard**: Create, Delete, Update protection
- **Ban Guard**: Prevents mass bans
- **Kick Guard**: Prevents mass kicks
- **Role Assign Guard**: Monitors role assignments to protected roles
- **Bot Guard**: Controls bot additions
- **Guild Update Guard**: Prevents server settings changes
- **Vanity Guard**: Protects vanity URL
- **Spam Guard**: Anti-spam protection
- **Advertisement Guard**: Anti-advertisement protection

### Setup Guard Bot:
1. Add guard bot credentials to `.env`:
```
GUARD_TOKEN = your_guard_bot_token
GUARD_BOT_ID = your_guard_bot_id
GUARD_PREFIX = .
```

2. Start both bots:
```bash
npm run all
```

3. Configure guard settings:
```bash
.guard-panel
```

4. Add safe users/roles:
- Open guard panel
- Navigate to Security Settings
- Add trusted users and roles
- Configure whitelist bots

### Guard Panel Features:
- **Security Settings**: Manage safe users, roles, bots, and protected roles
- **Guard Settings**: Toggle individual protection types
- **Limit Settings**: Configure action limits (10-minute windows)
- **Punishment Settings**: Customize penalties for violations
- **Backup Settings**: Configure automatic backups
- **Log Settings**: Set log channels
- **Command Permissions**: Manage command access
- **Anti-Spam Settings**: Configure spam thresholds

### How It Works:
1. Guard bot monitors all server actions through Discord events
2. Checks if action is performed by safe/whitelisted user
3. Verifies action against configured limits
4. If violation detected:
   - Reverses the action (if possible)
   - Applies configured punishment
   - Logs the incident
   - Notifies administrators

### Example Workflow:
```
User tries to delete a role
↓
Guard checks: Is user safe? → NO
↓
Guard checks: Is role protected? → YES
↓
Guard checks: Delete limit exceeded? → YES
↓
Actions:
1. Restore the role from backup
2. Remove permissions from violator
3. Apply punishment (jail/kick/ban)
4. Log to audit channel
```
