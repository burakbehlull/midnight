import { PermissionsManager} from "#managers";
import { ThemeBuilder } from "#libs";
import { Utils, messageSender } from "#helpers";

import { AuditLogEvent, PermissionsBitField } from "discord.js";

import config from '../config.json' with { type: 'json' };

class Manager {
  constructor(
    client,
    options = { action: null, authority: {}, utils: {}, theme: {}, sender: {} },
  ) {
    this.theme = new ThemeBuilder(
      options.theme?.action ? options.theme?.action : options.action,
    );
    this.utils = new Utils(
      options.theme?.action ? options.theme?.action : options.action,
    );
    this.authority = new PermissionsManager(
      options.authority?.action ? options.authority?.action : options.action,
    )
    this.sender = new messageSender(
      options.sender?.action ? options.sender?.action : options.action,
    )

    this.config = config
    this.audit = AuditLogEvent;
    this.flags = PermissionsBitField.Flags;
  }
}

export default Manager;