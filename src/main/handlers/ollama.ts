import {ipcMain} from 'electron';

import util from 'util';
import { exec as execCallback } from 'child_process';

const exec = util.promisify(execCallback);


async function startOllama() {
    try {
        console.log('Checking for running')
        const { stdout, stderr } = await exec('bash -c "ps -a | grep \'ollama-runner\' | awk \'{ print $1 }\'"');
        console.log('stdout:', stdout);
        console.error('stderr:', stderr);
        // try {
        //     console.log('Starting Ollama')
        //     const { stdout, stderr } = await exec('bash -c "ollama serve"');
        //     // console.log('stdout:', stdout);
        //     // console.error('stderr:', stderr);
        // } catch (error) {
        //     console.error(`exec error: ${error}`);
        //     return null;
        // }
    } catch (error) {
        console.error(`exec error: ${error}`);
        return null;
    }

}

ipcMain.handle('start-ollama', async (event) => {
    startOllama();
})