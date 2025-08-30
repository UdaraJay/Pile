// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';
import fs from 'fs';
import path from 'path';

export type Channels = 'ipc-example';

const electronHandler = {
  ipc: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke: ipcRenderer.invoke,
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
    removeListener(channel: Channels, func: any) {
      ipcRenderer.removeListener(channel, func);
    },
  },
  setupPilesFolder: (path: string) => {
    fs.existsSync(path);
  },
  getConfigPath: () => {
    return ipcRenderer.sendSync('get-config-file-path');
  },
  openFolder: (folderPath: string) => {
    if (folderPath.startsWith('/')) {
      shell.openPath(folderPath);
    }
  },
  existsSync: (path: string) => fs.existsSync(path),
  readDir: (path: string, callback: any) => fs.readdir(path, callback),
  isDirEmpty: (path: string) =>
    fs.readdir(path, (err, files) => {
      if (err) throw err;
      if (files.length === 0) {
        return true;
      }
      return false;
    }),
  readFile: (path: string, callback: any) =>
    fs.readFile(path, 'utf-8', callback),
  deleteFile: (path: string, callback: any) => fs.unlink(path, callback),
  writeFile: (path: string, data: any, callback: any) =>
    fs.writeFile(path, data, 'utf-8', callback),
  mkdir: (path: string) =>
    fs.promises.mkdir(path, {
      recursive: true,
    }),
  joinPath: (...args: any) => path.join(...args),
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  pathSeparator: path.sep,
  settingsGet: (key: string) => ipcRenderer.invoke('electron-store-get', key),
  settingsSet: (key: string, value: string) =>
    ipcRenderer.invoke('electron-store-set', key, value),

  // Store functionality for secure session storage
  store: {
    get: (key: string) => ipcRenderer.invoke('electron-store-get', key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke('electron-store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('electron-store-delete', key),
    has: (key: string) => ipcRenderer.invoke('electron-store-has', key),
    clear: () => ipcRenderer.invoke('electron-store-clear'),
  },

  // Gemini AI integration
  gemini: {
    // Invoke Gemini for JSON responses
    invokeGemini: (prompt: string) => {
      // Input schema validation
      if (!prompt || typeof prompt !== 'string') {
        return Promise.reject(
          new Error('Invalid prompt: must be a non-empty string'),
        );
      }
      if (prompt.length > 10000) {
        return Promise.reject(
          new Error('Prompt too long: maximum 10000 characters allowed'),
        );
      }
      return ipcRenderer.invoke('gemini:generate', prompt);
    },

    // Start streaming Gemini responses
    startStream: (prompt: string, selectedModel?: string, images?: string[]) => {
      // Input schema validation
      if (!prompt || typeof prompt !== 'string') {
        return Promise.reject(
          new Error('Invalid prompt: must be a non-empty string'),
        );
      }
      if (prompt.length > 10000) {
        return Promise.reject(
          new Error('Prompt too long: maximum 10000 characters allowed'),
        );
      }
      return ipcRenderer.invoke('gemini:stream', prompt, selectedModel, images);
    },

    // Listen to streaming responses
    onGeminiResponse: (callback: (data: any) => void) => {
      // Input validation for callback
      if (typeof callback !== 'function') {
        throw new Error('Invalid callback: must be a function');
      }

      const subscription = (_event: IpcRendererEvent, data: any) => {
        // Validate the data structure before passing to callback
        if (
          data &&
          typeof data === 'object' &&
          data.type &&
          data.streamId &&
          data.timestamp
        ) {
          callback(data);
        }
      };
      ipcRenderer.on('gemini:stream', subscription);

      return () => {
        ipcRenderer.removeListener('gemini:stream', subscription);
      };
    },

    // Remove all Gemini stream listeners
    removeAllStreamListeners: () => {
      ipcRenderer.removeAllListeners('gemini:stream');
    },

    // Generate structured JSON with predefined templates
    generateJson: (
      prompt: string,
      template: 'summary' | 'metadata' = 'summary',
      images?: string[],
    ) => {
      // Input schema validation
      if (!prompt || typeof prompt !== 'string') {
        return Promise.reject(
          new Error('Invalid prompt: must be a non-empty string'),
        );
      }
      if (prompt.length > 10000) {
        return Promise.reject(
          new Error('Prompt too long: maximum 10000 characters allowed'),
        );
      }
      if (template && !['summary', 'metadata'].includes(template)) {
        return Promise.reject(
          new Error('Invalid template: must be "summary" or "metadata"'),
        );
      }
      return ipcRenderer.invoke('gemini:generate-json', prompt, template, images);
    },

    // Test if API key is valid
    testApiKey: (apiKey?: string) => {
      return ipcRenderer.invoke('gemini:test-api-key', apiKey);
    },
  },

  // Shell functionality for opening external URLs
  shell: {
    openExternal: (url: string) => shell.openExternal(url),
    openPath: (path: string) => shell.openPath(path),
  },

  // Authentication functionality using loopback OAuth
  auth: {
    signInWithGoogle: () => ipcRenderer.invoke('auth:google-signin'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    signOut: () => ipcRenderer.invoke('auth:signout'),
    getProfile: (userId: string) => ipcRenderer.invoke('auth:get-profile', userId),
    getPiles: () => ipcRenderer.invoke('auth:get-piles'),
    createPile: (name: string, description?: string, isPrivate?: boolean) => 
      ipcRenderer.invoke('auth:create-pile', name, description, isPrivate),
  },

  // Sync functionality for per-pile Supabase syncing
  sync: {
    linkPile: (pilePath: string, remotePileId?: string) =>
      ipcRenderer.invoke('sync:link-pile', pilePath, remotePileId),
    unlinkPile: (pilePath: string) =>
      ipcRenderer.invoke('sync:unlink-pile', pilePath),
    runSync: (pilePath: string, mode?: 'pull' | 'push' | 'both') =>
      ipcRenderer.invoke('sync:run', pilePath, mode),
    getStatus: (pilePath?: string) =>
      ipcRenderer.invoke('sync:status', pilePath),
    listConflicts: (pilePath: string) =>
      ipcRenderer.invoke('sync:list-conflicts', pilePath),
    resolveConflict: (pilePath: string, postId: string, choice: 'local' | 'remote' | 'merged', mergedContent?: string) =>
      ipcRenderer.invoke('sync:resolve', pilePath, postId, choice, mergedContent),
    migrateCloudPile: (remotePileId: string, destFolder: string) =>
      ipcRenderer.invoke('sync:migrate-cloud-pile', remotePileId, destFolder),
    
    // Attachment management
    uploadAttachment: (pilePath: string, postId: string, filePath: string) =>
      ipcRenderer.invoke('sync:upload-attachment', pilePath, postId, filePath),
    listAttachments: (pilePath: string, postId: string) =>
      ipcRenderer.invoke('sync:list-attachments', pilePath, postId),
    getAttachmentSignedUrl: (postId: string, hash: string, filename?: string, expiresIn?: number) =>
      ipcRenderer.invoke('sync:get-attachment-url', postId, hash, filename, expiresIn),
    downloadAttachment: (pilePath: string, postId: string, hash: string, filename: string) =>
      ipcRenderer.invoke('sync:download-attachment', pilePath, postId, hash, filename),
    
    // Conflict management
    getConflict: (pilePath: string, conflictId: string) =>
      ipcRenderer.invoke('sync:get-conflict', pilePath, conflictId),
    getConflictArtifact: (pilePath: string, conflictId: string, version: 'local' | 'remote') =>
      ipcRenderer.invoke('sync:get-conflict-artifact', pilePath, conflictId, version),

    // Maintenance
    rescan: (pilePath: string) => ipcRenderer.invoke('sync:rescan', pilePath),
    clearQueue: (pilePath: string) => ipcRenderer.invoke('sync:clear-queue', pilePath),
    immediateSync: (pilePath: string) => ipcRenderer.invoke('sync:immediate-sync', pilePath),
    migrateToUuid: (pilePath: string) => ipcRenderer.invoke('sync:migrate-to-uuid', pilePath),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
