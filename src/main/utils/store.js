// const Store = require('electron-store');
import Store from 'electron-store';
const { safeStorage } = require('electron');

export default class SecureStore {
 constructor() {
   if (!safeStorage.isEncryptionAvailable()) {
     throw new Error('Encryption is not available on this system.');
   }
   this.store = new Store();
 }

 async getKey() {
   try {
     const encryptedKey = this.store.get('aiKey');
     if (!encryptedKey) return null;
     return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
   } catch (error) {
     console.error('Error retrieving AI key:', error);
     return null;
   }
 }

 async setKey(secretKey) {
   try {
     const encryptedKey = safeStorage.encryptString(secretKey);
     this.store.set('aiKey', encryptedKey.toString('base64'));
     return true;
   } catch (error) {
     console.error('Error setting AI key:', error);
     return false;
   }
 }

 async deleteKey() {
   try {
     this.store.delete('aiKey');
     return true;
   } catch (error) {
     console.error('Error deleting AI key:', error);
     return false;
   }
 }
}


