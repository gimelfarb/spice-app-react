const proxyTarget = Symbol('proxy target');
const proxyWrapper = Symbol('proxy wrapper');
const proxyUpdate = Symbol('proxy update');

/**
 * @param {any[]} args 
 * @returns {any[]}
 */
export function unwrapDOMProxyArgs(args) {
    args = Array.prototype.slice.call(args);
    args = args.map(v => unwrapDOMProxy(v));
    return args;
}

/**
 * @template T
 * @param {T} proxyObj 
 * @returns {T}
 */
export function unwrapDOMProxy(proxyObj) {
    return proxyObj[proxyTarget] || proxyObj;
}

/**
 * @typedef {object} ProxyOverride
 * @prop {(target: any, propName: string) => any} get
 * @prop {(target: any, propName: string, val: any) => void} set
 * @prop {(target: any, fnName: string, targetfn: function, args: any[]) => any} invoke
 */

/**
 * @typedef {Object.<string, ProxyOverride>} ProxyOverrideMap
 */

/**
 * @typedef {object} ProxyOpts
 * @prop {ProxyOverrideMap} override
 * @prop {ProxyOverride} default
 * @prop {object} extend
 */

/**
 * @template T
 * @param {T} domObj 
 * @param {ProxyOpts} [opts] 
 * @returns {T}
 */
export function proxyDOMObject(domObj, opts) {
    // Check if this is a proxy already, then just return it
    if (domObj[proxyTarget]) { return domObj; }
    if (domObj[proxyWrapper]) { return domObj[proxyWrapper]; }
    // Options provide behavior for the proxy
    opts = opts || {};
    opts.override = opts.override || {};
    // Using Object.create(prototype) to ensure that proxy is recognized
    // the same way as target DOM node, using 'instanceof' expressions
    const proxyObj = Object.create(Object.getPrototypeOf(domObj));
    proxyObj[proxyTarget] = domObj;
    domObj[proxyWrapper] = proxyObj;
    // Iterate over all enumerable properties on the DOM Node, and
    // recreate them on the proxy using the Object.defineProperty to
    // intercept access
    const proxyProperty = (propName) => {
        Object.defineProperty(proxyObj, propName, {
            get: () => {
                const override = {...opts.default, ...opts.override[propName]};
                if (typeof override.get === 'function') {
                    return override.get(domObj, propName);
                }
                const val = domObj[propName];
                if (typeof val === 'function') {
                    const valfn = (...args) => {
                        if (typeof override.invoke === 'function') {
                            return override.invoke(domObj, propName, val, args);
                        }
                        return val.apply(domObj, args);
                    }
                    valfn.toString = () => val.toString();
                    return valfn;
                }
                if (typeof override.wrap === 'function') {
                    return override.wrap(val);
                }
                return val;
            },
            set: (val) => {
                const override = {...opts.default, ...opts.override[propName]};
                if (typeof override.set === 'function') {
                    override.set(domObj, propName, val);
                    return;
                }
                domObj[propName] = val;
            }
        });
    };
    for (const propName in domObj) {
        proxyProperty(propName);
    }
    // Setup an updater function, so that properties added afterwards can be
    // proxied as well
    proxyObj[proxyUpdate] = (propNames) => {
        if (typeof propNames === 'string') { propNames = [propNames]; }
        propNames.forEach((propName) => proxyProperty(propName));
    }
    // Optionally extend with some properties
    if (opts.extend) {
        const keys = []
            .concat(Object.getOwnPropertyNames(opts.extend))
            .concat(Object.getOwnPropertySymbols(opts.extend));
        keys.forEach(key => Object.defineProperty(proxyObj, key, opts.extend[key]));
    }

    return proxyObj; 
}

/**
 * Update proxy with new properties.
 * 
 * @param {*} proxyObj 
 * @param { { propNames: string[] } } update 
 */
export function updateDOMProxy(proxyObj, update) {
    const updateFn = proxyObj[proxyUpdate];
    if (updateFn && update && update.propNames) {
        updateFn(update.propNames);
    }
}
