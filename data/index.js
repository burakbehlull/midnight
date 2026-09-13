export * from "./colors.js";
export * from "./themes.js";
import emojiData from "./emoji.json" with { type: 'json' }; 

export const emoji = emojiData.default || emojiData;