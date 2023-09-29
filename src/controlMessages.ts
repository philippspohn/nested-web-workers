// Wraps a message event handler to filter out internal control messages.
// When the option `once` is set, the event listener is removed after the first call that's not a control message.
export const filterControlMessages = (originalListener: (evt: MessageEvent) => void,
                                      removeListener?: (type: string, listener: EventListenerOrEventListenerObject) => void, once?: boolean) => {
    if(once && !removeListener) throw new Error("Cannot use once without removeListener");
    const func = function (event: MessageEvent) {
        if (event.data?.__nww_notification == true || event.data?.__nww_command === true) return;
        if (once) removeListener!("message", func as EventListenerOrEventListenerObject);
        originalListener(event);
    };
    return func;
};
