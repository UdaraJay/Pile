import Gen from './Gen.js'

// function requestOpts(args) {
//     var myHeaders = new Headers();
//     myHeaders.append("Content-Type", "application/json");

//     let data = {
//         "model": args.model,
//         "messages": args.messages,
//         "stream": true,
//         // "format": "json"
//     }

//     if (args.max_tokens) {
//         data["max_tokens"] = args.max_tokens;
//     }

//     if (args.response_format) {
//         data["response_format"] = args.response_format;
//     }

//     var raw = JSON.stringify(data);
//     var requestOptions = {
//         method: 'POST',
//         headers: myHeaders,
//         body: raw,
//         // redirect: 'follow'
//     };
//     return requestOptions;
// }

function requestOpts() {
    var raw = JSON.stringify({
        "model": "llama2",
        "messages": [
            {
                "role": "system",
                "content": "You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful."
            },
            {
                "role": "user",
                "content": "<p>I am adding onto the pile</p>\n"
            },
            {
                "role": "user",
                "content": "<p>I really struggle with getting myself to act on information that I am aware of.</p>\n"
            },
            {
                "role": "system",
                "content": "You can only respond in plaintext, do NOT use HTML."
            }
        ],
        "stream": true,
        "max_tokens": 200
    });

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
    };

    return requestOptions;
}

async function generate(args) {
    let requestOptions = requestOpts(args);
    console.log(args.stream)
    // if (args.stream) {
    let genout = Gen.prototype.generate(requestOptions)
    return genout;
    // } else {
    //     return await getBulk(requestOptions)
    // }

}
async function getBulk() {
    console.log("Fetching")
    let response = await fetch("http://127.0.0.1:11434/api/chat", requestOptions)
        .then(response => response.body.getReader())
        .then(response => response.text())
        .catch(error => console.log('error', error));
    console.log("Fetched")
    let parsed = JSON.parse(response)
    let content = parsed["message"]["content"]
    console.log("Content", content)
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
