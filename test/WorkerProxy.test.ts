import WorkerProxy from '../src/WorkerProxy';
import * as helpers from '../src/helpers';
import {ProxyNotification, ProxyNotificationMessage} from "../src/MessageTypes";

jest.mock('../src/helpers', () => {
    const originalModule = jest.requireActual('../src/helpers');

    return {
        ...originalModule,
        generateId: jest.fn(),
    };
});

describe('WorkerProxy', () => {

    const mockGenerateId = helpers.generateId as jest.MockedFunction<typeof helpers.generateId>;
    const postMessageMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateId.mockReturnValue('someId');
    });

    it('should correctly run the register command', () => {
        global.postMessage = postMessageMock;

        new WorkerProxy('someScript.js');

        expect(postMessageMock).toHaveBeenCalledTimes(1);
        expect(postMessageMock).toHaveBeenCalledWith({
            __nww_command: true,
            command: {type: "register", scriptURL: "someScript.js", options: undefined},
            targetId: "someId"
        });
        expect(mockGenerateId).toHaveBeenCalledTimes(1);
    });

    it('should correctly run the postMessage command', () => {
        global.postMessage = postMessageMock;

        const workerProxy = new WorkerProxy('someScript.js');
        workerProxy.postMessage("sampleMessage", {transfer: []});

        expect(postMessageMock).toHaveBeenCalledTimes(2); // One for the register and one for the postMessage
        expect(postMessageMock).toHaveBeenCalledWith({
            __nww_command: true,
            command: {
                type: "postMessage",
                message: "sampleMessage",
                options: {transfer: []}
            },
            targetId: "someId"
        });
        expect(mockGenerateId).toHaveBeenCalledTimes(1);
    });

    it('should correctly run the terminate command', () => {
        global.postMessage = postMessageMock;

        const workerProxy = new WorkerProxy('someScript.js');
        workerProxy.terminate();

        expect(postMessageMock).toHaveBeenCalledTimes(2); // One for the register and one for the terminate
        expect(postMessageMock).toHaveBeenCalledWith({
            __nww_command: true,
            command: {type: "terminate"},
            targetId: "someId"
        });
        expect(mockGenerateId).toHaveBeenCalledTimes(1);
    });

    it('should correctly notify listeners of messages', () => {
        const addEventListenerMock = jest.fn();

        const workerProxy = new WorkerProxy('someScript.js');
        workerProxy.addEventListener('message', addEventListenerMock);

        const notification: ProxyNotificationMessage = {
            __nww_notification: true,
            senderId: 'someId', targetId: 'someId',
            notification: {type: 'message', messageEvent: new MessageEvent('message', {data: 'sampleMessage'})}
        };
        global.dispatchEvent(new MessageEvent('message', {data: notification}));

        expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    });
});

