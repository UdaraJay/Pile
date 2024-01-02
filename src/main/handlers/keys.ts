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

ipcMain.handle('get-model-name', async () => {
  return await keytar.getPassword('pile', 'modelname');
});

ipcMain.handle('set-model-name', async (event, modelName) => {
  return await keytar.setPassword('pile', 'modelname', modelName);
});

ipcMain.handle('clear-model-name', async () => {
  return await keytar.deletePassword('pile', 'modelname');
});

ipcMain.handle('get-model-type', async () => {
  return await keytar.getPassword('pile', 'modeltype');
});

ipcMain.handle('set-model-type', async (event, modelType) => {
  return await keytar.setPassword('pile', 'modeltype', modelType);
});
