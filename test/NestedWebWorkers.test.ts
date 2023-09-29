import "../dist/nested-web-workers.esm.js";
import {expect} from "chai";

describe('Nested Web Workers', () => {
    let worker: Worker;
    beforeEach(() => {
        worker = new Worker("/base/test/worker.js");
        worker.addEventListener("error", (event) => {
            expect.fail("Worker error: " + event.message);
        });
        worker.addEventListener("message", (event) => {
            if (event.data.__nww_command || event.data.__nww_notification) {
                expect.fail("Worker received control message: " + JSON.stringify(event.data));
            }
        });
    });

    afterEach(() => {
        worker.terminate();
    });

    it('should respond to a ping', (done) => {
        worker.postMessage({type: "ping"});
        worker.onmessage = (event) => {
            if (event.data.type === "pong")
                done();
        };
    });

    it('should respond to a ping to a nested worker', async () => {
        worker.postMessage({type: "create-worker"});
        worker.postMessage({type: "create-worker"});

        const workerIds: number[] = await new Promise((resolve) => {
            const workerIds: number[] = [];
            worker.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === "worker-created") workerIds.push(msg.id);
                if (workerIds.length === 2) resolve(workerIds);
            };
        });

        worker.postMessage({type: "forward-to-child", id: workerIds[0], message: {type: "ping"}});
        await new Promise<void>((resolve) => {
            worker.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === "forward-from-child") {
                    expect(msg.id).to.equal(workerIds[0]);
                    expect(msg.message.type).to.equal("pong");
                    return resolve();
                }
            };
        });
    });

    it('should not receive any control messages when overwriting onmessage', async () => {
        let messageCounter = 0;
        let workerId: number | undefined = undefined;

        // Wrapper should filter control message for register command
        worker.onmessage = (event) => {
            messageCounter++;
            const msg = event.data;
            if (msg.type === "worker-created") workerId = msg.id;
        };
        worker.postMessage({type: "create-worker"});

        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        expect(messageCounter).to.equal(1);
        expect(workerId).to.be.a("number");
    });

    it('should allow removing event listeners', async () => {
        let timesCalled = 0;
        const listener = () => {
            timesCalled++;
        };

        worker.addEventListener("message", listener);
        worker.postMessage({type: "ping"});
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        worker.removeEventListener("message", listener);
        expect(timesCalled).to.equal(1);

        worker.postMessage({type: "ping"});
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        expect(timesCalled).to.equal(1);
    });

    it('should allow removing event listeners from nested workers', (done) => {
        worker.addEventListener("message", (event) => {
            if (event.data.type === "test-eventlisteners-success") done();
        });
        worker.postMessage({type: "test-eventlisteners"});
    });

    it('should allow sending ports', async () => {
        worker.postMessage({type: "create-worker"});
        await new Promise<void>((resolve) => {
            worker.addEventListener("message", e => {
                expect(e.data.type).to.equal("worker-created");
                resolve();
            }, {once: true});
        });

        const channel = new MessageChannel();
        worker.postMessage({
            type: "forward-to-child-with-port", id: 0,
            message: {type: "register-port", port: channel.port1}, port: channel.port1
        }, [channel.port1]);

        await new Promise<void>((resolve) => {
            worker.addEventListener("message", e => {
                expect(e.data.type).to.equal("forward-from-child");
                expect(e.data.message.type).to.equal("port-registered");
                resolve();
            }, {once: true});
        });

        channel.port2.postMessage({type: "ping"});
        await new Promise<void>((resolve) => {
            worker.addEventListener("message", e => {
                expect(e.data.type).to.equal("forward-from-child");
                expect(e.data.message.type).to.equal("forward-from-port");
                expect(e.data.message.message.type).to.equal("ping");
                resolve();
            }, {once: true});
        });
    });

    it("should execute 'once' event listeners only once", async () => {
        let timesCalled = 0;
        const listener = () => {
            timesCalled++;
        };

        let timesCalledOnceListener = 0;
        const onceListener = () => {
            timesCalledOnceListener++;
        };

        worker.addEventListener("message", listener);
        worker.addEventListener("message", onceListener, {once: true});

        // Create a nested worker, so that a command gets sent to the main thread
        // This ensures that control messages won't prevent the 'once' listener from being invoked.
        worker.postMessage({type: "create-worker", scilent: true});

        await new Promise<void>((resolve) => setTimeout(resolve, 100));

        worker.postMessage({type: "ping"});
        worker.postMessage({type: "ping"});

        await new Promise<void>((resolve) => setTimeout(resolve, 100));

        expect(timesCalled).to.equal(2);
        expect(timesCalledOnceListener).to.equal(1);
    });
});
