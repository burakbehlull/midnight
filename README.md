# Discord Public Server Bot
Server Public bot built with Discord v14 version, integrated with slash and prefix commands

### Usage:

Operating path:

` npm i `

` npm run deploy `

` npm start `

To enter bot settings, create an .env file, there is an example ` .env ` file named **.env-example** in the project.

```
TOKEN = 
BOT_ID = 
PREFIX = 
MONGO_URI = 
```

Create ` config.json ` file and set permission settings:
```json
{
    "BOT_OWNER_IDS": [] // safe bot owner ids
}
```

### contents:
| command | comment | values | situation |
| ------ | ------ | ------ | ------ |
| **settings** | Adjusts bot settings | options, role, channel,  user, value | stable |
| **authority** | Adjusts authorities settings | options, role, user, value | stable |
| **modlog** | Adjusts modlog settings | options, role, value | stable |
| **yaz** | This command allows you to write from the bot | text | stable |
| **ban** |  Ban the user | user -ticket, id- | stable |
| **unban** |  Unban the user | user id | stable |
| **kick** |  Kick the user | user -ticket, id- | stable |
| **snipe** |  Shows last deleted message | .. | stable |
| **tag** | Sets the server tag | .. | stable |
| **afk** | AFK mode | reason | stable |
| **avatar** | Shows user avatar | user | stable |
| **nuke** | Refreshes the channel | channel | stable |
| **streamer** | Gives streamer role | user | stable |
| **vip** | Gives vip role | user | stable |
| **sil** | Deletes messages | amount | stable |
| **çek** | Pulls the tagged user | user | stable |
| **git** | Goes to the user you were tagged in | user | stable |
| **kayit** | Saves the user you tagged in | user, name, age | stable |
| **kayitsiz** | Gives the user | user | stable |
| **vmute** | Throws voice mute on tagged user | user, second -exp. 10m -, reason | stable |
| **vunmute** | Unmute | user, reason | stable |
| **mute** | Throws chat mute on tagged user | user, reason | stable |
| **unmute** | user unmute for chat | user, reason | stable |
| **rolal** | Takes the user | user, role | stable |
| **rolver** | Gives the user | user, role | stable |
| **say** | Guild information | ... | stable |
| **kilit** | lock to Chat | aç | stable |
| **sesgir** | Join voice channel | channelId | stable |
| **sescik** | Leave voice channel | .. | stable |
| **cihaz** | Shows user device | user | stable |
| **allvmute** | Mutes all user in channel | channel | stable |
| **allvunmute** | Unmutes all user in channel | channel | stable |
| **emojiekle** | Add emoji to guilds | emoji or url, name | stable |
| **timeout** | Add emoji to guilds | user, time | stable |
| **spotify** | .. | .. | stable |
| **ship** | ships | user | stable |
| **level** | shows user level | user | stable |
| **level-top** | shows server top level | .. | stable |
| **stat** | shows user statics | user | stable |
| **stat-top** | shows server users statics | .. | stable |
| **invites** | shows invite statics | user | stable |
| **invite-top** | shows server users invites statics | .. | stable |
| **ticket-setup** | creates embed tickets | .. | stable |
| **itiraf-setup** | people are open or anonymous confessors | channel | stable |
| **help** | helps user | .. | un-stable |
| **room-setup** | private room creater | .. | stable |
| **tasks** | staff tasks | me, user | stable |
| **yetkibaslat** | start staff  | me, user | stable |

### events:
| feature | comment | set command |
| ------ | ------ | ------ | 
| otorole | Gives automatic roles to users | Can be set with the /settings Auto Role command |

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
| messageSender | Helps with responsiveness and rich embed creation | new messageSender() | 
| misc | Contains many auxiliary functions | misc.callFunction() | 
| components | A class that makes the components offered by Discord Js more useful | new Button(), new Modal() | 
