const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const merge = require('webpack-merge');
const reactConfig = require('./_fn.react.config');

/**
 * @param {string} folder example project folder
 */
module.exports = (folder) => {
    const entryPath = path.resolve(folder, './src');
    const outputPath = path.resolve(folder, './dist');
    const spiceModuleFolder = path.resolve(__dirname, '../');
    const templateHtmlFile = path.resolve(folder, './public/index.html');

    return merge(reactConfig(), {
        devtool: 'source-map',
        entry: entryPath,
        output: {
            path: outputPath,
        },
        resolve: {
            alias: {
                'spice-app-react': spiceModuleFolder,
            },
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: templateHtmlFile,
                inject: true,
            }),
        ],
    });
};
