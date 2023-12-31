importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@latest/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function (e) {
    if (e.data === "start") {
        setTimeout(() => {
            postMessage("[main success, starting nested workers]");
            startNestedWorkers();
        }, 1000);
    }
});

function startNestedWorkers() {
    let workerA = new Worker('workerA.js');
    let workerB = new Worker('workerB.js');
    let workerBad = new Worker('workerBad.js');


    workerA.onmessage = function (event) {
        postMessage(`main from A -> ${event.data}`);
    };

    workerA.onerror = function (event) {
        postMessage(`main from A (ERR) -> ${event.message}`);
    }

    workerB.onmessage = function (event) {
        postMessage(`main from B -> ${event.data}`)
    }

    workerB.onerror = function (event) {
        postMessage(`main from B (ERR) -> ${event.message}`)
    }

    workerBad.onmessage = function (event) {
        postMessage(`main from Bad -> ${event.data}`)
    }

    workerBad.onerror = function (event) {
        event.preventDefault(); // Prevents error from propagating further.
        postMessage(`main from Bad (ERR) -> ${event.message}`);
    }

    workerA.postMessage("start");
    workerB.postMessage("start");
    workerBad.postMessage("start");
}
