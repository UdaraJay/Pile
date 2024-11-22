import { ipcMain } from 'electron';
import SecureStore from '../utils/store';

const secureStore = new SecureStore();

ipcMain.handle('get-ai-key', () => secureStore.getKey());
ipcMain.handle('set-ai-key', (_, secretKey: string) => secureStore.setKey(secretKey));
ipcMain.handle('delete-ai-key', () => secureStore.deleteKey());
