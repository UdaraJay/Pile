import { ipcMain } from 'electron';
import keytar from 'keytar';

ipcMain.handle('get-ai-key', async () => {
  return await keytar.getPassword('pile', 'aikey');
});

ipcMain.handle('set-ai-key', async (event, secretKey) => {
  return await keytar.setPassword('pile', 'aikey', secretKey);
});

ipcMain.handle('delete-ai-key', async () => {
  return await keytar.deletePassword('pile', 'aikey');
});
