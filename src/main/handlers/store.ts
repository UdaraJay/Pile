import { ipcMain } from 'electron';
import settings from 'electron-settings';

ipcMain.handle('electron-store-get', async (event, key) => {
  return await settings.get(key);
});

ipcMain.handle('electron-store-set', async (event, key, value) => {
  await settings.set(key, value);
});
