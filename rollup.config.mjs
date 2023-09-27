import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/nested-web-workers.umd.js',
            format: 'umd',
            name: 'NestedWebWorkers',
            sourcemap: true
        },
        {
            file: 'dist/nested-web-workers.esm.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/nested-web-workers.cjs.js',
            format: 'cjs',
            sourcemap: true
        }
    ],
    plugins: [resolve(), commonjs(), typescript(), json()]
};
