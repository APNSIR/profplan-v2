const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 650,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const indexPath = path.join(app.getAppPath(), 'out', 'index.html');

    mainWindow.loadFile(indexPath);

    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});