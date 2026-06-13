const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: config => ipcRenderer.invoke('config:save', config),
  clearConfig: () => ipcRenderer.invoke('config:clear'),
  startBot: () => ipcRenderer.invoke('bot:start'),
  stopBot: () => ipcRenderer.invoke('bot:stop'),
  getBotStatus: () => ipcRenderer.invoke('bot:status'),
  onBotLog: callback => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('bot:log', handler)
    return () => ipcRenderer.removeListener('bot:log', handler)
  },
  onBotReady: callback => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('bot:ready', handler)
    return () => ipcRenderer.removeListener('bot:ready', handler)
  },
  onBotError: callback => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('bot:error', handler)
    return () => ipcRenderer.removeListener('bot:error', handler)
  },
  onBotStopped: callback => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('bot:stopped', handler)
    return () => ipcRenderer.removeListener('bot:stopped', handler)
  }
})
