const { app, BrowserWindow } = require('electron')
const path = require('path')
const Sentry = require('@sentry/node')

const isDev = process.env.NODE_ENV === 'development'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: isDev ? 'development' : 'production',
    release: process.env.APP_VERSION || '0.1.0',
  })
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  Sentry.captureException(error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  Sentry.captureException(reason)
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Grimoire',
    backgroundColor: '#0F1629',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('dndbeyond.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          alwaysOnTop: true,
        },
      }
    }
    return { action: 'allow' }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
