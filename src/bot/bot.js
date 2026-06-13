const path = require('path')
const util = require('util')
const { app } = require('electron')

function getBotEntryPath () {
  return path.join(
    app.getAppPath(),
    'sherlock-sheep',
    'dist-electron',
    'electron-entry.js'
  )
}

function clearBotRequireCache (rootDir) {
  const normalizedRoot = path.resolve(rootDir).toLowerCase()

  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.toLowerCase().startsWith(normalizedRoot)) {
      delete require.cache[modulePath]
    }
  }
}

function createConsoleBridge (emit, botRootDir) {
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug
      ? console.debug.bind(console)
      : console.log.bind(console),
    trace: console.trace
      ? console.trace.bind(console)
      : console.log.bind(console)
  }

  const normalizedBotRoot = path
    .resolve(botRootDir)
    .replace(/\\/g, '/')
    .toLowerCase()

  const shouldForward = () => {
    const stack = new Error().stack || ''
    return stack.replace(/\\/g, '/').toLowerCase().includes(normalizedBotRoot)
  }

  const formatMessage = args => {
    if (args.length === 1 && args[0] instanceof Error) {
      return args[0].stack || args[0].message || String(args[0])
    }
    return util.format(...args)
  }

  const forward = (level, args) => {
    if (!shouldForward()) return
    emit('log', { level, message: formatMessage(args) })
  }

  console.log = (...args) => {
    originalConsole.log(...args)
    forward('info', args)
  }

  console.info = (...args) => {
    originalConsole.info(...args)
    forward('info', args)
  }

  console.warn = (...args) => {
    originalConsole.warn(...args)
    forward('warn', args)
  }

  console.error = (...args) => {
    originalConsole.error(...args)
    forward('error', args)
  }

  console.debug = (...args) => {
    originalConsole.debug(...args)
    forward('info', args)
  }

  console.trace = (...args) => {
    originalConsole.trace(...args)
    forward('error', args)
  }

  return () => {
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.debug = originalConsole.debug
    console.trace = originalConsole.trace
  }
}

async function createBot (config, emit) {
  const entryPath = getBotEntryPath()
  clearBotRequireCache(path.dirname(entryPath))
  const restoreConsole = createConsoleBridge(emit, path.dirname(entryPath))

  let botModule
  try {
    botModule = require(entryPath)
  } catch (err) {
    restoreConsole()
    throw new Error(
      `Could not load compiled bot from:\n  ${entryPath}\n\n` +
        `Run "npm run bot:build" first.\n\nOriginal error: ${err.message}`
    )
  }

  if (
    typeof botModule.start !== 'function' ||
    typeof botModule.stop !== 'function'
  ) {
    throw new Error(
      `Bot entry point must export start() and stop().\n` +
        `See sherlock-sheep/src/electron-entry.ts for the required shape.`
    )
  }

  // Pass emit into start so the bot can surface logs/events to the UI
  try {
    await botModule.start(config, emit)
  } catch (err) {
    restoreConsole()
    throw err
  }

  // Return a fake "client" object with destroy() so main.js can stop it
  return {
    destroy: async () => {
      try {
        await botModule.stop()
      } finally {
        restoreConsole()
      }
    }
  }
}

module.exports = { createBot }
