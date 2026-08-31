# Sherlock Sheep Discord Bot + Electron GUI

[Discord bot repo here](https://github.com/lunalucid/sherlock-sheep-bot)

```bash
# From the root (discord-bot-electron/)
npm install           # install Electron deps
npm run bot:build     # installs bot's deps + compiles to dist-electron/
npm run dev           # run the app
```

```bash
npm run build        # current platform
npm run build:win    # Windows .exe installer
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux AppImage
```

Output goes to `dist/`.

---

## Adding config fields

To expose a new setting in the UI (e.g. a system prompt, a channel ID):

| File | Change |
|------|--------|
| `src/main/main.js` | Add to `config:get` and `config:save` IPC handlers |
| `src/renderer/index.html` | Add an `<input>` in the settings form |
| `src/renderer/renderer.js` | Read/write the new field in `loadConfig()` and the save handler |
| `sherlock-sheep/src/electron-entry.ts` | Destructure the new field from `config` |

---

## Sending logs to the UI

Call `emit('log', { level, message })` anywhere in your entry point:

```ts
emit('log', { level: 'info',    message: 'Command registered' });
emit('log', { level: 'success', message: 'Ready!' });
emit('log', { level: 'warn',    message: 'Rate limit hit' });
emit('log', { level: 'error',   message: 'OpenAI request failed' });
```

If you want to use `emit` in files other than `electron-entry.ts`, pass it down as a parameter or store it in a module-level variable and export a `log()` helper.

---

## Security

- `contextIsolation: true` + `nodeIntegration: false` — renderer cannot access Node
- Credentials stored with AES encryption via `electron-store` (change the `encryptionKey` in `main.js` per project)
- External links open in the system browser, not Electron
- Strict Content Security Policy in `index.html`

---

## Discord Developer Portal checklist

1. Create an app at https://discord.com/developers/applications
2. **Bot** tab → enable **Message Content Intent** (if your bot reads messages)
3. Copy the **Token** → paste into the app's Settings tab
4. **OAuth2 → URL Generator** → select `bot` + `applications.commands` → set permissions → invite to server

---

## Requirements

- Node.js 18+
- npm 8+
- Bot's own dependencies (installed automatically by `npm run bot:build`)
