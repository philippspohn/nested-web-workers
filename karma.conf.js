module.exports = function (config) {
    config.set({
        files: [
            {pattern: 'dist/*', watched: true, included: false, served: true},
            {pattern: 'test/**/*.ts', watched: true},
            {pattern: 'test/**/*.js', watched: true, included: false, served: true},
        ],
        frameworks: ['mocha', 'chai', "karma-typescript"],
        plugins: ["karma-mocha", "karma-chai", "karma-chrome-launcher", "karma-safari-launcher", "karma-typescript"],
        preprocessors: {
            'test/**/*.ts': ['karma-typescript'],
        },

        reporters: ['progress', 'karma-typescript'],
        browsers: ["Safari", "Chrome"],
    })
}
