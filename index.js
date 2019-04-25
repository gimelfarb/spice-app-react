/* eslint-disable no-undef */
if (process.env.NODE_ENV === 'production') {
    module.exports = require('./dist/cjs/spice-app-react.production');
} else {
    module.exports = require('./dist/cjs/spice-app-react.development');
}
