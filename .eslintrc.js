module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "babel-eslint",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "react"
    ],
    "settings": {
        "react": {
            "version": "detect"
        }
    },
    "overrides": [
        {
            "files": [
                "webpack.config.js",
                "webpack.*.config.js",
                "webpack/**/*.config.js"
            ],
            "env": {
                "node": true
            }
        }
    ],
    "rules": {
        "react/jsx-uses-react": "error",
        "react/jsx-uses-vars": "error",
        "react/prop-types": "off",
    }
};
