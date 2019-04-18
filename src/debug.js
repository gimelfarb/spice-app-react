/* eslint-disable no-console */
/** 
 * @typedef {Object} IDebugOps
 * @prop {boolean} enabled
 * @prop {(message: any, ...optionalParams?: any[]) => void} log
 */

/** @type {IDebugOps} */
const devImpl = {
    enabled: true,
    log: console.log,
};

const _noop = () => {};

/** @type {IDebugOps} */
const prodImpl = {
    enabled: false,
    log: _noop,
};

/* global process */
const impl = (process.env.NODE_ENV === 'development') ? devImpl : prodImpl;
export default impl;
