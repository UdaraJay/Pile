import settings from 'electron-settings';
import { safeStorage } from 'electron';

if (!safeStorage.isEncryptionAvailable()) {
  throw new Error('Encryption is not available on this system.');
}

export async function getKey(): Promise<string | null> {
  try {
    const encryptedKey = await settings.get('aiKey');
    if (!encryptedKey || typeof encryptedKey !== 'string') return null;
    return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
  } catch (error) {
    console.error('Error retrieving AI key:', error);
    return null;
  }
}

export async function setKey(secretKey: string): Promise<boolean> {
  try {
    const encryptedKey = safeStorage.encryptString(secretKey);
    await settings.set('aiKey', encryptedKey.toString('base64'));
    return true;
  } catch (error) {
    console.error('Error setting AI key:', error);
    return false;
  }
}

export async function deleteKey(): Promise<boolean> {
  try {
    await settings.unset('aiKey');
    return true;
  } catch (error) {
    console.error('Error deleting AI key:', error);
    return false;
  }
}
