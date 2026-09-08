import { readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('../../node_modules/emoji-picker-element-data/en/emojibase/data.json', import.meta.url), 'utf8'));
const emojis = [...new Set(source.flatMap((item) => [item.emoji, ...(item.skins || []).map((skin) => skin.emoji)]))];
const target = new URL('../../pocketbase/pb_hooks/forum-emoji-allowlist.js', import.meta.url);
await writeFile(target, `module.exports=Object.freeze(${JSON.stringify(emojis)});\n`, 'utf8');
console.log(`Allowlist Forum: ${emojis.length} emoji Unicode.`);
