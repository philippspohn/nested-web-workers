importScripts("/base/dist/nested-web-workers.esm.js");

const myWorkers = [];
const myPorts = [];

onmessage = (e) => {
    if (e.data.__nww_notification || e.data.__nww_command) throw new Error("Received control message: " + JSON.stringify(e.data));
    const data = e.data;
    if (data.type === "ping") {
        self.postMessage({type: "pong"});
    } else if (data.type === "create-worker") {
        const worker = new Worker("/base/test/worker.js");
        const workerId = myWorkers.length;
        worker.onmessage = (childE) => {
            self.postMessage({type: "forward-from-child", id: workerId, message: childE.data});
        };
        myWorkers.push(worker);
        if (!data.scilent) self.postMessage({type: "worker-created", id: workerId});
    } else if (data.type === "forward-to-child") {
        myWorkers[data.id].postMessage(data.message);
    } else if (data.type === "forward-to-child-with-port") {
        console.log("forwarding to child with port")
        myWorkers[data.id].postMessage(data.message, [data.port]);
    } else if (data.type === "test-eventlisteners") {
        const worker = new Worker("/base/test/worker.js");
        let counter = 0;
        let receivedPong = false;
        const listener = (childE) => {
            counter++;
            if (childE.data.type === "pong") receivedPong = true;
        }
        worker.addEventListener("message", listener);
        setTimeout(() => {
            if (counter !== 1) throw new Error("Expected exactly one message, got " + counter);
            if (!receivedPong) throw new Error("Expected to receive pong");
            worker.removeEventListener("message", listener);
            worker.postMessage({type: "ping"});
            setTimeout(() => {
                if (counter !== 1) throw new Error("Expected exactly one message, got " + counter);
                self.postMessage({type: "test-eventlisteners-success"});
            }, 100);
        }, 100);
        worker.postMessage({type: "ping"});
    } else if (data.type === "register-port") {
        const port = data.port;
        const portId = myPorts.length;
        port.onmessage = (portE) => {
            self.postMessage({type: "forward-from-port", id: portId, message: portE.data});
        };
        port.start();
        myPorts.push(port);
        self.postMessage({type: "port-registered", id: portId});
    } else {
        throw new Error("Unknown message type: " + data.type);
    }
};
