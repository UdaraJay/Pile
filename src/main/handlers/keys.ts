import { ipcMain } from 'electron';
import { getKey, setKey, deleteKey } from '../utils/store';

ipcMain.handle('get-ai-key', async () => {
  return getKey();
});

ipcMain.handle('set-ai-key', async (_, secretKey) => {
  return setKey(secretKey);
});

ipcMain.handle('delete-ai-key', async () => {
  return deleteKey();
});
