export default class Gen {
    async * generate(requestOptions) {
        let ENDPOINT = "http://127.0.0.1:11434/api/chat"
        console.log(requestOptions)
        const response = await fetch(ENDPOINT, { ...requestOptions, redirect: 'follow' });

        console.log(response)

        if (!response.body instanceof ReadableStream) {
            throw new Error('Missing body');
        }
        
        let reader = response.body.getReader();
        console.log(reader)
        let result = await reader.read();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (!result.done) {
            buffer += decoder.decode(result.value, { stream: true });
            let newlineIdx = buffer.indexOf("\n");
            while (newlineIdx !== -1) {
                let jsonPart = buffer.slice(0, newlineIdx);
                console.log(jsonPart);
                yield JSON.parse(jsonPart);
                // Remove the parsed part from the buffer
                buffer = buffer.slice(newlineIdx + 1);
                newlineIdx = buffer.indexOf("\n");
            }
            result = await reader.read();
        }
        console.log("Reader done")

    }

}