importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@latest/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function (e) {
    if (e.data.type === "start") {
        postMessage({type: "message", message: "[one]: worker started"});

        // Create a MessageChannel and send port1 to workerTwo (via workerMain)
        const channel = new MessageChannel();
        postMessage({type: "port", port: channel.port1}, [channel.port1]);

        // Listen for messages from workerTwo
        channel.port2.onmessage = (event) => {
            postMessage({type: "message", message: "[one]: received: " + event.data});
            if(event.data.startsWith("Hello")) channel.port2.postMessage("Hello from workerOne!");
            if(event.data.startsWith("Bye")) {
                channel.port2.postMessage("Bye from workerOne!");
                channel.port2.close();
            }
        }
        channel.port2.start();
    }
});
