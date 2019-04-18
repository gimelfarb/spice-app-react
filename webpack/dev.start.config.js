require('dotenv-flow').config();

const path = require('path');
const fs = require('fs');

const merge = require('webpack-merge');
const examplesConfig = require('./_fn.examples.config');

const example_name = process.env.DEV_START_EXAMPLE;
if (!example_name) throw new Error('Missing DEV_START_EXAMPLE env variable');

const folder = path.resolve(__dirname, '../examples', example_name);
if (!fs.existsSync(folder)) throw new Error('Unknown folder: ' + folder);

module.exports = merge(examplesConfig(folder), {
    mode: "development",
    devServer: {
        before: (app) => {
            app.get('/favicon.ico', (_, res) => res.sendFile(path.resolve(__dirname, './assets/favicon.ico')));
        }
    },
});
