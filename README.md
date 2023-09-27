# Nested Web Workers

A polyfill library to enable the use of nested Web Workers (subworkers) in browsers that don't natively support them, such as Safari.
By routing messages over the main thread, this library offers a seamless way to use nested web workers in your applications.

## Installation

Install via npm:
```
npm install nested-web-workers
```

You can directly include the library in your HTML using a script tag:
```
<script src="https://cdn.jsdelivr.net/npm/nested-web-workers@1.0.1/dist/nested-web-workers.umd.js"></script>
```

Using importScripts:
```
importScripts('https://cdn.jsdelivr.net/npm/nested-web-workers@1.0.1/dist/nested-web-workers.umd.js');
```

## Usage
The primary purpose of this library is to enable the usage of nested web workers by routing messages over the main thread. For it to work correctly, you must import the library both in your main thread and inside all of your web workers. By importing the library, it overwrites the native Worker to enable the nesting functionality.

### Importing the Library
If you're including the library directly in your HTML or using importScripts, the library will automatically take care of the necessary overwrites.

Using ES Modules:
```
import 'nested-web-workers';
```


### Using filterControlMessages
This library introduces control messages that facilitate the nesting of web workers. While these messages are necessary for the internal functioning of the library, they might not be relevant for your application logic.

`filterControlMessages` acts as a utility wrapper to ensure that your message handler is only triggered by non-control messages. This abstraction lets you focus solely on your application-specific logic, making your code cleaner and easier to maintain.

```
import { filterControlMessages } from 'nested-web-workers';

const worker = new Worker('path-to-worker.js');

worker.onmessage = filterControlMessages((e) => {
    console.log('Received worker message:', e.data);
    // Your code to handle messages from the worker.
});
```

With this setup, the handler function will only process the relevant messages, ensuring that the internal control messages don't interfere with your application logic.
