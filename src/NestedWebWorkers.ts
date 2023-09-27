import {ProxyCommand, ProxyCommandMessage, ProxyNotificationMessage} from "./MessageTypes";
import WorkerProxy from "./WorkerProxy";
import {generateId, isWorker} from "./helpers";

if (isWorker) {
    if (!self.Worker) self.Worker = WorkerProxy;
} else {
    const RealWorker = Worker;
    Worker = class extends Worker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
            super(scriptURL, options);
            registerWorker(this, generateId(), undefined);
        }
    };

    const managedWorkers: { [id: string]: { parentId?: string, worker: Worker } } = {};

    const registerWorker = (worker: Worker, workerId: string, parentId?: string) => {
        managedWorkers[workerId] = {worker, parentId};

        // Listen to messages from worker to parent
        worker.addEventListener("message", (e: MessageEvent) => {
            // Check if it's a command
            if (e.data && e.data.__nww_command) {
                const msg = e.data as ProxyCommandMessage;
                const command = msg.command;
                switch (command.type) {
                    case "register":
                        const worker = new RealWorker(command.scriptURL, command.options);
                        registerWorker(worker, msg.targetId, workerId);
                        break;
                    case "postMessage":
                        if (managedWorkers[msg.targetId]) {
                            managedWorkers[msg.targetId].worker.postMessage(command.message, command.options);
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
            } else {
                // Otherwise, notify the worker's parent (the proxy)
                if (!parentId) return; // Not a nested worker
                const notification: ProxyNotificationMessage = {
                    __nww_notification: true,
                    senderId: workerId,
                    targetId: parentId,
                    notification: {
                        type: "message",
                        messageEvent: {
                            data: e.data, lastEventId: e.lastEventId, origin: e.origin
                        }
                    }
                };
                managedWorkers[parentId].worker.postMessage(notification);
            }
        });

        // Notify the proxy about events
        // If it's not a nested worker, we don't need to do anything (no proxy)
        if (parentId) {
            worker.addEventListener("error", (e: ErrorEvent) => {
                const notification: ProxyNotificationMessage & { noti_id: string } = {
                    __nww_notification: true,
                    noti_id: generateId(),
                    senderId: workerId,
                    targetId: parentId,
                    notification: {
                        type: "error",
                        errorEvent: {
                            colno: e.colno, filename: e.filename, lineno: e.lineno, message: e.message,
                        }
                    }
                };
                managedWorkers[parentId].worker.postMessage(notification);
            });
            worker.addEventListener("messageerror", (e: MessageEvent) => {
                const notification: ProxyNotificationMessage = {
                    __nww_notification: true,
                    senderId: workerId,
                    targetId: parentId,
                    notification: {
                        type: "messageerror",
                        messageEvent: {
                            data: e.data, lastEventId: e.lastEventId, origin: e.origin
                        }
                    }
                };
                managedWorkers[parentId].worker.postMessage(notification);
            });
        }
    };
}
