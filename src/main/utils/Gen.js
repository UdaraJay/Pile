export default class Gen {
    async * generate(requestOptions) {
        let ENDPOINT = "http://127.0.0.1:11434/api/chat"
        const response = await fetch(ENDPOINT, { ...requestOptions, redirect: 'follow' });
        if (!response.body instanceof ReadableStream) {
            throw new Error('Missing body');
        }
        
        let reader = response.body.getReader();
        let result = await reader.read();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        
        let canceled = false;
        let timeout = 10 * 1000;
        let t = new Timer(() => {canceled = true}, timeout);
        t.stop();
        while (!result.done && !canceled) {
            buffer += decoder.decode(result.value, { stream: true });
            let newlineIdx = buffer.indexOf("\n");
            while (newlineIdx !== -1) {
                let jsonPart = buffer.slice(0, newlineIdx);
                yield JSON.parse(jsonPart);
                // Apply the timeout to time between messages
                t.reset(timeout);
                // Remove the parsed part from the buffer
                buffer = buffer.slice(newlineIdx + 1);
                newlineIdx = buffer.indexOf("\n");
            }
            result = await reader.read();
        }
        console.log("Done reading")
        console.log("Canceled: " + canceled)
        t.stop();
    }
}

function Timer(fn, ms) {
    let timer = setInterval(fn, ms);
    this.stop = function () {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        return this;
    }
    this.start = function () {
        if (!timer) {
            this.stop();
            timer = setInterval(fn, ms);
        }
        return this;
    }
    this.reset = function (newMs) {
        ms = newMs;
        return this.stop().start();
    }
}