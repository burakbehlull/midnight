import { AuditLogEvent, PermissionsBitField } from "discord.js";

import config from '../config.json' with { type: 'json' };

class Manager {
  constructor(
    client,
    options = { 
        action: null, 
    },
  ) {
    this.client = client;

    /*this.theme = new ThemeBuilder(
      options.theme?.action ? options.theme?.action : options.action,
    ); */
   

    this.config = config
    this.audit = AuditLogEvent;
    this.flags = PermissionsBitField.Flags;
  }
}

export default Manager;