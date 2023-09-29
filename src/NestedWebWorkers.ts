import {ProxyCommandMessage, ProxyNotificationMessage} from "./MessageTypes";
import WorkerProxy from "./WorkerProxy";
import {generateId, isWorker} from "./helpers";
import {filterControlMessages} from "./controlMessages";

if (isWorker) {
    // If the current execution context (like a Web Worker) does not have the native Worker support,
    // use the WorkerProxy as a fallback to enable nested Web Workers functionality.
    if (!self.Worker) self.Worker = WorkerProxy;

    const listenerMap = new WeakMap<EventListenerOrEventListenerObject, (event: MessageEvent) => void>();

    // Wraps the addEventListener and removeEventListener method to filter out internal control messages.
    const originalRemoveEventListener = self.removeEventListener.bind(self);
    self.removeEventListener = (type: any, callback: any, options?: any) => {
        const wrappedCallback = listenerMap.get(callback) || callback;
        originalRemoveEventListener(type, wrappedCallback, options);
    };

    const originalAddEventListener = self.addEventListener.bind(self);
    self.addEventListener = (type: any, callback: any, options?: any) => {
        const direct = options?.direct || type !== "message";
        if (!direct && typeof callback === "function") {
            const wrappedCallback = filterControlMessages(callback, originalRemoveEventListener, options?.once);
            originalAddEventListener(type, wrappedCallback, {...options, once: false});
            listenerMap.set(callback, wrappedCallback);
        } else if (!direct && "handleEvent" in callback && typeof callback.handleEvent === "function") {
            const wrappedCallback = filterControlMessages(callback.handleEvent.bind(callback), originalRemoveEventListener, options?.once);
            originalAddEventListener(type, wrappedCallback, {...options, once: false});
            listenerMap.set(callback, wrappedCallback);
        } else {
            originalAddEventListener(type, callback, options);
        }
    };
    // Overwrite the onmessage property to filter out internal control messages.
    const originalGetter = Object.getOwnPropertyDescriptor(self, 'onmessage')?.get;
    const originalSetter = Object.getOwnPropertyDescriptor(self, 'onmessage')?.set;
    if (originalGetter && originalSetter) {
        Object.defineProperty(self, 'onmessage', {
            get() {
                return originalGetter().call(self);
            },
            set(handler) {
                if (!handler || typeof handler !== 'function') {
                    originalSetter.call(self, null);
                    return;
                }

                const wrappedHandler = filterControlMessages(handler);
                originalSetter.call(self, wrappedHandler);
            },
            enumerable: true,
            configurable: true
        });
    }


} else {
    const RealWorker = Worker;

    const managedWorkers: { [id: string]: { parentId?: string, worker: Worker } } = {};
    const oldAddEventListener = Worker.prototype.addEventListener;
    const oldRemoveEventListener = Worker.prototype.removeEventListener;
    const oldOnMessageGetter = Object.getOwnPropertyDescriptor(Worker.prototype, "onmessage")?.get;
    const oldOnMessageSetter = Object.getOwnPropertyDescriptor(Worker.prototype, "onmessage")?.set;

    // Overwrite the Worker constructor to register the worker and add event listeners.
    class EnhancedWorker extends Worker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
            super(scriptURL, options);
            registerWorker(this, generateId(), undefined);
        }
    }

    Worker = EnhancedWorker;

    const listenerMap = new WeakMap<EventListenerOrEventListenerObject, (event: MessageEvent) => void>();

    // Wraps the addEventListener method to filter out internal control messages.
    EnhancedWorker.prototype.addEventListener = function (type: any, callback: any, options?: any) {
        const direct = options?.direct || type !== "message";
        if (!direct && typeof callback === "function") {
            const wrappedCallback = filterControlMessages(callback, oldRemoveEventListener.bind(this), options?.once);
            oldAddEventListener.call(this, type, wrappedCallback as EventListenerOrEventListenerObject, {...options, once: false});
            listenerMap.set(callback, wrappedCallback);
        } else if (!direct && "handleEvent" in callback && typeof callback.handleEvent === "function") {
            const wrappedCallback = filterControlMessages(callback.handleEvent.bind(callback), oldRemoveEventListener.bind(this), options?.once);
            oldAddEventListener.call(this, type, wrappedCallback as EventListenerOrEventListenerObject, {...options, once: false});
            listenerMap.set(callback, wrappedCallback);
        } else {
            oldAddEventListener.call(this, type, callback, options);
        }
    };

    EnhancedWorker.prototype.removeEventListener = function (type: any, callback: any, options?: any) {
        const wrappedCallback = listenerMap.get(callback) || callback;
        oldRemoveEventListener.call(this, type, wrappedCallback, options);
    };

    // Overwrite the onmessage property to filter out internal control messages.
    if (oldOnMessageGetter && oldOnMessageSetter) {
        Object.defineProperty(EnhancedWorker.prototype, 'onmessage', {
            set: function (listener) {
                if (listener === null) {
                    oldOnMessageSetter.call(this, null);
                    return;
                }
                oldOnMessageSetter.call(this, filterControlMessages(listener).bind(this));
            },
            get: function () {
                return oldOnMessageGetter.call(this);
            },
            enumerable: true,
            configurable: true
        });
    }

    // Add worker to the list of managed Web Workers and register event listeners.
    const registerWorker = (worker: Worker, workerId: string, parentId?: string) => {
        managedWorkers[workerId] = {worker, parentId};
        worker.addEventListener("message", handleWorkerMessage(workerId, parentId), {direct: true} as any);
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
