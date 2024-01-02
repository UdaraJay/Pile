export default class Gen {
    async * generate(requestOptions) {
        const parseJSON = async function* (itr) {
            console.log("parseJSON input type")
            console.log(typeof itr)
            console.log(itr)
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            for await (const chunk of itr) {
                buffer += decoder.decode(chunk);

                const parts = buffer.split("\n");

                buffer = parts.pop() ?? "";

                for (const part of parts) {
                    try {
                        yield JSON.parse(part);
                    } catch (error) {
                        console.warn("invalid json: ", part);
                    }
                }
            }

            for (const part of buffer.split("\n").filter(p => p !== "")) {
                try {
                    yield JSON.parse(part);
                } catch (error) {
                    console.warn("invalid json: ", part);
                }
            }
        };

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
        
            let endOfObjectIndex = buffer.indexOf('\n');
            while (endOfObjectIndex !== -1) {
                const jsonStr = buffer.slice(0, endOfObjectIndex);
                yield JSON.parse(jsonStr);
        
                buffer = buffer.slice(endOfObjectIndex + 1);
                endOfObjectIndex = buffer.indexOf('\n');
            }
        
            result = await reader.read();
        }

        while (!result.done) {
            buffer += decoder.decode(result.value, { stream: true });
            let newlineIdx = buffer.indexOf("\n");
            let jsonPart = buffer.slice(0, newlineIdx);
            console.log(jsonPart);
            yield JSON.parse(jsonPart);
            result = await reader.read();
        }
        console.log("Reader done")

        // const iterator = parseJSON(reader);
        // console.log("parseJSON output type")
        // console.log(typeof iterator)
        // for await (const message of iterator) {
        //     if (message.done) {
        //         console.log("Done")
        //         break;
        //     }
        //     yield message;
        // }
    }

}