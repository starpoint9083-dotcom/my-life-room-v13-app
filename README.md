# My Life Room V13

Cloudflare Workers deployment source for `my-life-room-v13`.

Build command: `npm install`

Deploy command: `npx wrangler deploy`

Required runtime bindings after the first code deployment:

- D1: `DB` → `my-life-room-v13`
- R2: `AVATAR_ASSETS` → `my-life-room-assets-v13`
- Workers AI: `AI`

Do not connect this repository to any existing Worker other than `my-life-room-v13`.
