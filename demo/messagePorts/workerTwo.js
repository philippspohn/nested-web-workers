importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@latest/dist/nested-web-workers.umd.js');

onmessage = (function(e) {
    if (e.data.type === "start") {
        postMessage({type: "message", message: "[two]: worker started"});
    } else if (e.data.type === "port") {
        postMessage({type: "message", message: "[two]: received port"})
        e.data.port.postMessage("Hello from workerTwo!");
        e.data.port.onmessage = (event) => {
            postMessage({type: "message", message: "[two]: received: " + event.data});
            if(event.data.startsWith("Hello")) {
                e.data.port.postMessage("Bye from workerTwo!");
                e.data.port.close();
            }
        }
    }
});
