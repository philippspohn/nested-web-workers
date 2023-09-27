export const filterControlMessages = (fn: (e: MessageEvent) => any): (e: MessageEvent) => any => {
    return (e: MessageEvent) => {
        if (e.data && e.data.__nww_notification || e.data && e.data.__nww_command) {
            return;
        }
        return fn(e);
    }
}

export const isControlMessage = (e: MessageEvent): boolean => {
    return e.data && e.data.__nww_notification || e.data && e.data.__nww_command;
}
