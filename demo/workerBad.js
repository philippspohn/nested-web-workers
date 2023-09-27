importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@latest/dist/nested-web-workers.umd.js');

onmessage = NestedWebWorkers.filterControlMessages(function(e) {
    if (e.data === "start") {
        setTimeout(() => {
            throw new Error("[worker Bad error]");
        }, 500);
    }
});
