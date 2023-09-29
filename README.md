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
The primary purpose of this library is to enable the usage of nested web workers by routing messages over the main thread. For it to work correctly, you must import the library both in your **main thread** and inside **all of your web workers**. By importing the library, it overwrites the native Worker to enable the nesting functionality.

### Importing the Library
If you're including the library directly in your HTML or using importScripts, the library will automatically take care of the necessary overwrites.

Using ES Modules:
```
import 'nested-web-workers';
```
The nested-web-workers library does not export any functions, classes, or values. Once imported, it will automatically take care of the necessary overwrites to enable this functionality. Simply import it and proceed with using nested web workers as if they were natively supported.
