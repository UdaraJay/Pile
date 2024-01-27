const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

const setupAutoUpdater = (mainWindow) => {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        mainWindow.webContents.send('update_available');
    });

    autoUpdater.on('update-not-available', () => {
        mainWindow.webContents.send('update_not_available');
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update_downloaded');
    });

    ipcMain.on('restart_app', () => {
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (error) => {
        console.log('Pile auto update error')
        mainWindow.webContents.send('update_error', error);
    });
};

module.exports = setupAutoUpdater;
