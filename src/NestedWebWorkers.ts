import {ProxyCommandMessage, ProxyNotificationMessage} from "./MessageTypes";
import WorkerProxy from "./WorkerProxy";
import {generateId, isWorker} from "./helpers";

if (isWorker) {
    // If the current execution context (like a Web Worker) does not have the native Worker support,
    // use the WorkerProxy as a fallback to enable nested Web Workers functionality.
    if (!self.Worker) self.Worker = WorkerProxy;
} else {
    const RealWorker = Worker;

    // Replace native Worker with a custom Worker implementation to register the worker with the main thread.
    Worker = class extends Worker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
            super(scriptURL, options);
            registerWorker(this, generateId(), undefined);
        }
    };

    const managedWorkers: { [id: string]: { parentId?: string, worker: Worker } } = {};

    // Add worker to the list of managed Web Workers and register event listeners.
    const registerWorker = (worker: Worker, workerId: string, parentId?: string) => {
        managedWorkers[workerId] = {worker, parentId};

        worker.addEventListener("message", handleWorkerMessage(workerId, parentId));
        if (parentId) {
            worker.addEventListener("error", handleWorkerError(workerId, parentId));
            worker.addEventListener("messageerror", handleWorkerMessageError(workerId, parentId));
        }
    };

    const handleWorkerMessage = (workerId: string, parentId?: string) => (e: MessageEvent) => {
        if (e.data && e.data.__nww_command) {
            handleCommand(e, workerId);
        } else {
            if (!parentId) return; // If there's no parent, it's not a nested worker
            relayNestedWorkerMessageToProxy(e, workerId, parentId);
        }
    };


    const handleCommand = (event: MessageEvent, workerId: string) => {
        const msg = event.data as ProxyCommandMessage;
        const command = msg.command;
        switch (command.type) {
            case "register":
                const worker = new RealWorker(command.scriptURL, command.options);
                registerWorker(worker, msg.targetId, workerId);
                break;
            case "postMessage":
                if (managedWorkers[msg.targetId]) {
                    managedWorkers[msg.targetId].worker.postMessage(command.message, [...event.ports]);
                }
                break;
            case "terminate":
                if (managedWorkers[msg.targetId]) {
                    managedWorkers[msg.targetId].worker.terminate();
                    delete managedWorkers[msg.targetId];
                }
                break;
            case "propagateError":
                const parentId = managedWorkers[msg.targetId]?.parentId;
                if (parentId && managedWorkers[parentId]) {
                    managedWorkers[parentId].worker.dispatchEvent(new ErrorEvent("error", {
                        ...command.errorEvent,
                        message: command.errorEvent.message?.startsWith("Error: ") ? "Uncaught " + command.errorEvent.message : command.errorEvent.message
                    }));
                }
                break;
            default:
                console.warn("Unknown command", command);
        }
    };

    const relayNestedWorkerMessageToProxy = (e: MessageEvent, workerId: string, parentId: string) => {
        const notification: ProxyNotificationMessage = {
            __nww_notification: true,
            senderId: workerId,
            targetId: parentId,
            notification: {
                type: "message",
                messageEvent: {
                    data: e.data,
                    lastEventId: e.lastEventId,
                    origin: e.origin
                }
            }
        };
        managedWorkers[parentId].worker.postMessage(notification, [...e.ports]);
    };

    const handleWorkerError = (workerId: string, parentId: string) => (e: ErrorEvent) => {
        const notification: ProxyNotificationMessage = {
            __nww_notification: true,
            senderId: workerId,
            targetId: parentId,
            notification: {
                type: "error",
                errorEvent: {
                    colno: e.colno,
                    filename: e.filename,
                    lineno: e.lineno,
                    message: e.message,
                }
            }
        };
        managedWorkers[parentId].worker.postMessage(notification);
    };

    const handleWorkerMessageError = (workerId: string, parentId: string) => (e: MessageEvent) => {
        const notification: ProxyNotificationMessage = {
            __nww_notification: true,
            senderId: workerId,
            targetId: parentId,
            notification: {
                type: "messageerror",
                messageEvent: {
                    data: e.data,
                    lastEventId: e.lastEventId,
                    origin: e.origin
                }
            }
        };
        managedWorkers[parentId].worker.postMessage(notification);
    };
}
