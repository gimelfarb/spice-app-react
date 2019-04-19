/**
 * Return a proxy which traces how object is being used.
 * 
 * @template T
 * @param {T} obj 
 * @param {string?} name
 * @param {Object?} opts
 * @returns {T}
 */
export function traceUse(obj, name, opts) {
    if (!isTraceable(obj)) return obj;

    if (typeof name === 'object') {
        opts = name;
        name = 'obj';
    } else {
        name = name || 'obj';
        opts = opts || {};
    }

    const traceFnUse = (target, thisArg, args) => {
        if (opts.logger) {
            opts.logger(`[CALL] ${name}()`);
        }
        if (opts.untraceFuncArgs || /\[native code\]/.test(target.toString())) {
            args = Array.prototype.slice.call(args);
            args = args.map(v => removeTrace(v));
        }
        const ret = target.apply(opts.thisArg || thisArg, args);
        if (isTraceable(ret)) {
            return traceUse(ret, ['[', name, '()]'].join(''), opts);
        }
        return ret;
    };

    if (typeof obj === 'function') {
        return function () {
            return traceFnUse(obj, this, arguments);
        };
    }

    return new Proxy(obj, {
        apply: traceFnUse,
        get: (target, propname) => {
            if (propname === '___traceUseOf') {
                return target;
            }
            if (opts.logger && opts.get) {
                opts.logger(`[GET ] ${name}.${propname.toString()}`);
            }
            const val = target[propname];
            const propdesc = Object.getOwnPropertyDescriptor(target, propname);
            if (isTraceable(val, propdesc)) {
                return traceUse(val, [name, propname.toString()].join('.'), {...opts, thisArg: target});
            }
            return val;
        },
        set: (target, propname, val) => {
            if (opts.logger) {
                opts.logger(`[SET ] ${name}.${propname.toString()}`);
            }
            target[propname] = val;
            return true;
        },
        getPrototypeOf: (target) => {
            return Object.getPrototypeOf(target);
        },
        getOwnPropertyDescriptor: (target, propname) => {
            if (!target.hasOwnProperty(propname)) { return; }
            const self = this;
            return {
                get: () => self.get(target, propname),
                set: (val) => self.set(target, propname, val),
                configurable: true,
                enumerable: true
            };
        },
    });
}

function isTraceable(val, propdesc) {
    return !!val
        && (typeof val['___traceUseOf'] === 'undefined')
        && (
                (typeof val === 'object' && !(val instanceof Array))
            ||  (typeof val === 'function' && (!propdesc || typeof propdesc.value === 'undefined'))
        );
}

function removeTrace(val) {
    const traced = val['___traceUseOf'];
    return (typeof traced !== 'undefined') ? traced : val;
}
