const libConfig = require('./_fn.lib.config');

const libTargets = ['cjs', 'umd'];

module.exports = libTargets.flatMap(
    target => [true, false].map(production => 
        libConfig({target, production})
    )
);
