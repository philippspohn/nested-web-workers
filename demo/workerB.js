importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@1.0.0/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function (e) {
    if (e.data === "start") {
        setTimeout(() => {
            postMessage("[worker B success, starting nested worker]");
            startNestedWorker();
        }, 1000);
    }
});

function startNestedWorker() {
    let workerA = new Worker('workerA.js');

    workerA.onmessage = function(event) {
        postMessage(`workerB from A -> ${event.data}`);
    };

    workerA.onerror = function(event) {
        postMessage(`workerB from A -> ${event.message}`);
    }

    workerA.postMessage("start");
}
