const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')

const store = new Store({
  encryptionKey: 'sherlock-sheep-encryption-key',
  name: 'config'
})

let mainWindow
let botProcess = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 640,
    minWidth: 680,
    minHeight: 520,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Security: renderer can't access Node directly
      nodeIntegration: false // Security: no direct Node in renderer
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#dfe2fb',
      height: 35,
      width: 'full'
    },
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png')
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Open external links in default browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  stopBot()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('config:get', () => {
  return {
    discordToken: store.get('discordToken', ''),
    openaiKey: store.get('openaiKey', ''),
    guildId: store.get('guildId', '')
  }
})

ipcMain.handle('config:save', (_, config) => {
  try {
    if (config.discordToken !== undefined)
      store.set('discordToken', config.discordToken)
    if (config.openaiKey !== undefined) store.set('openaiKey', config.openaiKey)
    if (config.guildId !== undefined) store.set('guildId', config.guildId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('config:clear', () => {
  store.clear()
  return { success: true }
})

ipcMain.handle('bot:start', async () => {
  if (botProcess) return { success: false, error: 'Bot is already running.' }

  const config = {
    discordToken: store.get('discordToken'),
    openaiKey: store.get('openaiKey'),
    guildId: store.get('guildId')
  }

  if (!config.discordToken && !config.openaiKey) {
    return {
      success: false,
      error:
        'Missing configuration. Please set up your bot in the settings tab.'
    }
  }

  if (!config.discordToken) {
    return {
      success: false,
      error:
        'Missing Discord bot token. Set up a Discord bot at https://discord.com/developers/applications.'
    }
  }

  if (!config.openaiKey) {
    return {
      success: false,
      error:
        'Missing OpenAI API key. Log into your OpenAi account and create and manage a key at https://platform.openai.com/api-keys.'
    }
  }

  try {
    const { createBot } = require('../bot/bot')
    botProcess = await createBot(config, (event, data) => {
      // Forward bot events to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`bot:${event}`, data)
      }
    })
    return { success: true }
  } catch (err) {
    botProcess = null
    return { success: false, error: err.message }
  }
})

ipcMain.handle('bot:stop', async () => {
  return stopBot()
})

ipcMain.handle('bot:status', () => {
  return { running: botProcess !== null }
})

function stopBot () {
  if (!botProcess) return { success: true }
  try {
    botProcess.destroy()
    botProcess = null
    return { success: true }
  } catch (err) {
    botProcess = null
    return { success: false, error: err.message }
  }
}
