import { ipcMain } from 'electron';
import pileVectorIndex from '../utils/pileVectorIndex';

ipcMain.handle('vectorindex-init', (event, pilePath) =>
  pileVectorIndex.initialize(pilePath)
);

ipcMain.handle('vectorindex-get', (event, pilePath) =>
  pileVectorIndex.getVectorIndex(pilePath)
);

ipcMain.handle('vectorindex-rebuild', (event, pilePath) =>
  pileVectorIndex.rebuildVectorIndex(pilePath)
);

ipcMain.handle('vectorindex-query', (event, text) =>
  pileVectorIndex.query(text)
);

ipcMain.handle('vectorindex-retriever', (event, text) =>
  pileVectorIndex.query(text)
);
