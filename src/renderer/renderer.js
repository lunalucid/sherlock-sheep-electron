let eventCount = 0
const MAX_LOG_ITEMS = 200

const statusDot = document.getElementById('statusDot')
const statusLabel = document.getElementById('statusLabel')
const cardStatus = document.getElementById('cardStatus')
const cardTag = document.getElementById('cardTag')
const cardEvents = document.getElementById('cardEvents')
const botTagLine = document.getElementById('botTagLine')
const startBtn = document.getElementById('startBtn')
const stopBtn = document.getElementById('stopBtn')
const logPreview = document.getElementById('logPreview')
const logFull = document.getElementById('logFull')
const saveStatus = document.getElementById('saveStatus')

document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document
      .querySelectorAll('.nav-btn')
      .forEach(b => b.classList.remove('active'))
    document.getElementById(`tab-${tabId}`)?.classList.add('active')
    document
      .querySelector(`.nav-btn[data-tab="${tabId}"]`)
      ?.classList.add('active')
  })
})

document.querySelectorAll('.reveal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target)
    if (!input) return
    input.type = input.type === 'password' ? 'text' : 'password'
  })
})

async function loadConfig () {
  const config = await window.electronAPI.getConfig()
  document.getElementById('discordToken').value = config.discordToken || ''
  document.getElementById('openaiKey').value = config.openaiKey || ''
  document.getElementById('guildId').value = config.guildId || ''
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const config = {
    discordToken: document.getElementById('discordToken').value.trim(),
    openaiKey: document.getElementById('openaiKey').value.trim(),
    guildId: document.getElementById('guildId').value.trim()
  }
  const result = await window.electronAPI.saveConfig(config)
  showSaveStatus(
    result.success ? 'Saved.' : `Error: ${result.error}`,
    !result.success
  )
})

document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('Clear all saved credentials? This cannot be undone.')) return
  await window.electronAPI.clearConfig()
  document.getElementById('discordToken').value = ''
  document.getElementById('openaiKey').value = ''
  document.getElementById('guildId').value = ''
  showSaveStatus('All data cleared.')
})

function showSaveStatus (msg, isError = false) {
  saveStatus.textContent = msg
  saveStatus.className = 'save-status' + (isError ? ' error' : '')
  clearTimeout(saveStatus._t)
  saveStatus._t = setTimeout(() => (saveStatus.textContent = ''), 3000)
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true
  addLog('info', 'Starting bot…')
  const result = await window.electronAPI.startBot()
  if (!result.success) {
    addLog('error', result.error || 'Failed to start bot.')
    setStatus('offline')
    startBtn.disabled = false
  }
})

stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true
  const result = await window.electronAPI.stopBot()
  if (!result.success) {
    addLog('error', result.error || 'Failed to stop bot.')
    stopBtn.disabled = false
  } else {
    addLog('info', 'Bot stopped.')
    setStatus('offline')
  }
})

window.electronAPI.onBotReady(({ tag }) => {
  setStatus('online', tag)
  addLog('success', `Bot online as ${tag}`)
  botTagLine.textContent = `Running as ${tag}`
})

window.electronAPI.onBotLog(({ level, message }) => {
  addLog(level, message)
})

window.electronAPI.onBotError(({ message }) => {
  addLog('error', message)
  setStatus('error')
})

window.electronAPI.onBotStopped(() => {
  setStatus('offline')
  addLog('info', 'Bot disconnected.')
})

function setStatus (state, tag = null) {
  const labels = { online: 'Online', offline: 'Offline', error: 'Error' }
  statusDot.className = `status-dot ${state}`
  statusLabel.textContent = labels[state] || state
  cardStatus.textContent = labels[state] || state

  if (tag) cardTag.textContent = tag
  else if (state !== 'online') {
    cardTag.textContent = '—'
    botTagLine.textContent =
      'Configure your bot in Settings, then start it below.'
  }

  startBtn.disabled = state === 'online'
  stopBtn.disabled = state !== 'online'
}

function addLog (level, message) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false })
  eventCount++
  cardEvents.textContent = eventCount
  ;[logPreview, logFull].forEach(list => {
    const li = document.createElement('li')
    li.className = `log-item level-${level}`
    li.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-level">${level}</span>
      <span class="log-msg">${escHtml(message)}</span>
    `
    list.prepend(li)

    while (list.children.length > MAX_LOG_ITEMS) {
      list.removeChild(list.lastChild)
    }
  })
}

document.getElementById('clearLogsBtn').addEventListener('click', () => {
  logFull.innerHTML = ''
  logPreview.innerHTML = ''
  eventCount = 0
  cardEvents.textContent = 0
})

function escHtml (str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

;(async () => {
  await loadConfig()
  const { running } = await window.electronAPI.getBotStatus()
  setStatus(running ? 'online' : 'offline')
})()
