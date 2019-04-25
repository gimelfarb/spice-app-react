const path = require('path');
const merge = require('webpack-merge');
const reactConfig = require('./_fn.react.config');

const libraryTargetMap = {
    'cjs': 'commonjs2'
};

module.exports = (env) => {
    env = env || {};
    const isProd = !!env.production;
    const target = env.target || 'cjs';

    const folder = path.resolve(__dirname, '..');
    const entryPath = path.resolve(folder, './src');
    const outputPath = path.resolve(folder, './dist', target);
    const library = 'spice-app-react';
    const libraryTarget = libraryTargetMap[target] || target;
    const filename = `${library}.${isProd ? 'production' : 'development'}.js`;
        
    return merge(reactConfig(), {
        mode: isProd ? 'production' : 'development',
        devtool: 'source-map',
        entry: entryPath,
        output: {
            path: outputPath,
            filename,
            libraryTarget,
        },
        externals: {
            'react': 'react',
            'react-dom': 'react-dom',
        }
    });
};
