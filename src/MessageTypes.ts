// Commands (sent from workers to main thread)
type RegisterCommand = {
    type: 'register';
    scriptURL: string | URL;
    options?: WorkerOptions;
};

type PostMessageCommand = {
    type: 'postMessage';
    message: any;
    options?: StructuredSerializeOptions;
};

type TerminateCommand = {
    type: 'terminate';
};

type PropagateErrorCommand = {
    type: 'propagateError';
    errorEvent: ErrorEventInit;
}


type ProxyCommand = RegisterCommand | PostMessageCommand | TerminateCommand | PropagateErrorCommand;

type ProxyCommandMessage = {
    __nww_command: true;
    targetId: string;
    command: ProxyCommand;
}

// Notifications (sent from main thread to workers)
type ProxyMessageNotification = {
    type: 'message';
    messageEvent: MessageEventInit;
}

type ProxyErrorNotification = {
    type: 'error';
    errorEvent: ErrorEventInit;
}

type ProxyMessageErrorNotification = {
    type: 'messageerror';
    messageEvent: MessageEventInit;
}

type ProxyNotification = ProxyMessageNotification | ProxyErrorNotification | ProxyMessageErrorNotification;

type ProxyNotificationMessage = {
    __nww_notification: true;
    senderId: string;
    targetId: string;
    notification: ProxyNotification;
}

export {
    ProxyCommandMessage,
    ProxyCommand,
    RegisterCommand,
    PostMessageCommand,
    TerminateCommand,
    ProxyNotificationMessage,
    ProxyNotification,
    ProxyMessageNotification,
    ProxyErrorNotification,
    ProxyMessageErrorNotification
};
