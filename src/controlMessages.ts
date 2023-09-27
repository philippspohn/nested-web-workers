/**
 * Wraps a message event handler to filter out internal control messages.
 *
 * Use this to prevent internal control messages from being processed by your application's logic.
 *
 * @example
 * ```typescript
 * worker.onmessage = filterControlMessages((event: MessageEvent) => {
 *     console.log('Received data:', event.data);
 * });
 * ```
 *
 * @param fn - The original message event handler.
 * @returns A new message event handler that filters out control messages and delegates to the original handler for other messages.
 */
export const filterControlMessages = (fn: (event: MessageEvent) => any): (event: MessageEvent) => any => {
    return (event: MessageEvent) => {
        if (event.data && event.data.__nww_notification || event.data && event.data.__nww_command) {
            return;
        }
        return fn(event);
    }
}

/**
 * Checks if a given message event is an internal control message.
 *
 * @param event - The message event to be checked.
 * @returns true if the message event is a control message, false otherwise.
 */
export const isControlMessage = (event: MessageEvent): boolean => {
    return event.data && event.data.__nww_notification || event.data && event.data.__nww_command;
}
