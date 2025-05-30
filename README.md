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
    "permissions": {
        "isOwners": true, // Güvenli kişi yetkisi açık
		"isRole": true, // Güvenli rol yetkisi açık
        "isAuthority": true, // Tanımlanan yetkiler açık olacak mı?
        "roles": [], // Güvenli Roller
        "owners": [] // Güvenli Kişiler
    }
}
```

### contents:
| command | comment | situation |
| ------ | ------ | ------ |
| **set** | Adjusts bot settings | stable |
| **ban** |  ban the user | stable |
| **tag** | Sets the server tag | incomplete but stable |

**Permission Manager** functions and uses:
| Function | Values | Use | 
| -------- | -------- | -------- | 
| .control() | Checks the permissions and returns true accordingly. | .control(...flags) | 
| .isOwners() | userId | Returns true if there is an id equal to the specified id. | 
| .isRoles() | ... | Returns true if there is an id equal to the specified id. | 
| .isAuthority() | authorities | .isAuthority(userId, new PermissionManager().flags.Administrator) | 
| .selectOwnerIds() | status, userIds | ... | 
| .selectRolesId() | status, userIds | For example, you can open "whitelist": [user ids] in config.json and then use the whitelist as the key and use the incoming id as a fixed list. | 