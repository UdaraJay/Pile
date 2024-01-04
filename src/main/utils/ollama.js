import Gen from './Gen.js'

function requestOpts(args) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let data = {
        "model": args.model,
        "messages": args.messages,
        "stream": true,
        // "format": "json"
    }

    if (args.max_tokens) {
        data["max_tokens"] = args.max_tokens;
    }

    if (args.response_format) {
        data["response_format"] = args.response_format;
    }

    var raw = JSON.stringify(data);
    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        // redirect: 'follow'
    };
    return requestOptions;
}

async function generate(args) {
    let requestOptions = requestOpts(args);
    if (args.stream) {
        try {
            let genout = Gen.prototype.generate(requestOptions)
            return genout;
        } catch (error) {
            console.log("Error in ollama.js generate")
            console.log(error)
            return null;
        }
    } else {
        try {
            return await getBulk(requestOptions)
        } catch (error) {
            console.log("Error in ollama.js generate for getBulk")
            console.log(error)
            return null;
        }
    }

}
async function getBulk() {
    let response = await fetch("http://127.0.0.1:11434/api/chat", requestOptions)
        .then(response => response.body.getReader())
        .then(response => response.text())
        .catch(error => console.log('error', error));
    let parsed = JSON.parse(response)
    let content = parsed["message"]["content"]
    return content;
}
// Create an object with the chat.completions.create function set to be equal to generate
let ollama = {
    chat: {
        completions: {
            create: generate
        }
    }
}

let createInstance =  () => {
    // let instance = await ollama;
    return ollama;
}

// Export the ollama object
export default createInstance;