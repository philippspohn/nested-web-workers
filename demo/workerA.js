importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@1.0.0/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function(e) {
    if (e.data === "start") {
        setTimeout(() => {
            postMessage("[worker A success]");
        }, 1000);
    }
});
