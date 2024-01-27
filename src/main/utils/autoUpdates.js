const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;

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
  }
}

export default AppUpdater;