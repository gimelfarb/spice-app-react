/**
 * Ensure callback is executed only once. On subsequent invocations returns
 * the stored value.
 * 
 * @template T
 * @callback OnceDispatch
 * @param {string} key Caching key, callback executed once per key
 * @param {() => T} cb Callback which is called once per given key
 * @returns {T} Returns whatever the callback returned the first time
 */

/**
 * Create the once(key, cb) dispatch function, which will be used to
 * ensure that callback only executes once for a given key. This is a
 * specialized case of 'memoization'.
 * 
 * @returns {OnceDispatch<any>}
 */
export function createOnce() {
    const _once = {};
    return (key, cb) => (key in _once) ? _once[key] : (_once[key] = cb());
}
