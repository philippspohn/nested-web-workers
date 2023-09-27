import {ProxyCommand, ProxyCommandMessage, ProxyNotificationMessage} from "./MessageTypes";
import {generateId} from "./helpers";

type EventListenerEntry = {
    callback: EventListenerOrEventListenerObject | null;
    options?: EventListenerOptions | boolean;
};

class WorkerProxy implements Worker {
    private readonly id: string;

    constructor(scriptURL: string | URL, options?: WorkerOptions) {
        this.id = generateId();
        this.runCommand({
            type: "register", scriptURL, options
        });
        self.addEventListener("message", (e: MessageEvent) => {
            // Listen to event notifications from the actual worker
            if (e.data && e.data.__nww_notification && e.data.senderId === this.id) {
                const msg = e.data as ProxyNotificationMessage;
                const notification = msg.notification;
                switch (notification.type) {
                    case "message": {
                        const evt = new MessageEvent("message", notification.messageEvent)
                        this.onmessage(evt);
                        this.dispatchEvent(evt);
                        break;
                    }
                    case "error": {
                        const evt = new ErrorEvent("error", {...notification.errorEvent, cancelable: true});
                        this.onerror(evt);
                        let propagateEvent = this.dispatchEvent(evt);
                        if (propagateEvent) {
                            this.runCommand({
                                type: "propagateError",
                                errorEvent: notification.errorEvent
                            });
                        }
                        break;
                    }
                    case "messageerror": {
                        const evt = new MessageEvent("messageerror", notification.messageEvent);
                        this.onmessageerror(evt);
                        this.dispatchEvent(evt);
                        break;
                    }
                    default:
                        console.warn("Unknown notification", notification);
                }
            }
        });
    }

    onerror(ev: ErrorEvent): any {
    }

    onmessage(ev: MessageEvent): any {
    }

    onmessageerror(ev: MessageEvent): any {
    }

    private listeners: Map<string, EventListenerEntry[]> = new Map();

    addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void;
    addEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: any, callback: any, options?: any): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }

        this.listeners.get(type)!.push({
            callback,
            options
        });
    }

    removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
    removeEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(
        type: any,
        callback: any,
        options?: any
    ): void {
        const listeners = this.listeners.get(type);
        if (listeners) {
            const index = listeners.findIndex(listener => listener.callback === callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }

            if (listeners.length === 0) {
                this.listeners.delete(type);
            }
        }
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this.listeners.get(event.type);
        if (!listeners) return !event.defaultPrevented;
        for (let listener of listeners) {
            if (typeof listener.callback === 'function') {
                listener.callback(event);
            } else if (listener.callback && typeof listener.callback.handleEvent === 'function') {
                listener.callback.handleEvent(event);
            }
        }
        return !event.defaultPrevented;
    }


    postMessage(message: any, transfer: Transferable[]): void;
    postMessage(message: any, options?: StructuredSerializeOptions): void;
    postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions): void {
        const options: StructuredSerializeOptions | undefined = Array.isArray(transfer) ? {transfer: transfer as Transferable[]} : transfer;
        this.runCommand({
            type: "postMessage", message, options
        });
    }

    terminate(): void {
        this.runCommand({type: "terminate"});
    }

    private runCommand(command: ProxyCommand): any {
        const commandMsg: ProxyCommandMessage = {
            __nww_command: true, command, targetId: this.id
        };
        self.postMessage(commandMsg);
    }

}

export default WorkerProxy;
