importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@latest/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function(e) {
    if (e.data === "start") {
        postMessage("[main]: worker started");
        const workerOne = new Worker("workerOne.js");
        const workerTwo = new Worker("workerTwo.js");

        // forward messages to main thread
        workerOne.addEventListener("message", (event) => {
            if(event.data.type === "message") postMessage(event.data.message);
        });

        workerTwo.addEventListener("message", (event) => {
            if(event.data.type === "message") postMessage(event.data.message);
        });

        // forward ports from workerOne to workerTwo
        // (it would probably be better to create the MessageChannel here and pass it to both workers, but this is just for testing)
        workerOne.addEventListener("message",(event)=>{
            if(event.data.type === "port") {
                workerTwo.postMessage({
                    type: "port",
                    port: event.data.port
                }, [event.data.port]);
            }
        })

        workerOne.postMessage({type: "start"});
        workerTwo.postMessage({type: "start"});

    }
});
