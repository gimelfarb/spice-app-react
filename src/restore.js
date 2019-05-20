import debug from './debug';
import { createOnce } from './once';

/**
 * Stores a list of all undo operations to perform to restore object to the original state.
 * 
 * @typedef {object} Restorable
 * @prop {() => Restorable} createNew Creates new instance of same type of Restorable
 * @prop {import('./once').OnceDispatch<any>} once Executes callback only once for the given key, returns saved value
 * @prop {(name: string, factory?: () => Restorable) => Restorable} sub Returns child restorable for the given key (for sub-properties)
 * @prop {(cb: () => void)} pushUndo Push an undo operation to perform during restore
 * @prop {() => void} restore Replay all undo operations
 */

/**
 * Creates a basic Restorable tracker instance, which can be used to store a list of
 * undo operations to replay to restore object to the original state.
 * 
 * @returns {Restorable}
 */
export function createRestorable() {
    const _undo = [];
    const _once = createOnce();
    return {
        // Creates new instance of this type of Restorable
        createNew() {
            return createRestorable();
        },
        // Executes callback only once for the given key, returns saved value
        once: _once,
        // Returns child restorable for the given key (for sub-properties)
        sub(name, factory) {
            return this.once('sub:' + name, () => {
                const subr = factory ? factory() : this.createNew();
                this.pushUndo(() => subr.restore());
                return subr;
            });
        },
        // Push an undo operation to perform during restore
        pushUndo(cb) {
            return _undo.push(cb);
        },
        // Replay all undo operations
        restore() {
            _undo.forEach(cb => cb());
        }
    };
}

/**
 * @typedef {object} ObjectRestorableExtend
 * @prop {(obj: object, propName: string, val: any) => void} set Track property assignment
 * 
 * @typedef {Restorable & ObjectRestorableExtend} ObjectRestorable
 */

/**
 * Creates a Restorable which can track object property assignments (e.g. obj\[name\] = val).
 * During restore, all properties are returned to original sttate, i.e. either reset to original
 * value, or deleted, if they didn't exist.
 * 
 * @returns {ObjectRestorable}
 */
export function createObjectRestorable() {
    const restorable = createRestorable();
    return {
        ...restorable,
        createNew () {
            return createObjectRestorable();
        },
        // Tracks property assignment
        set (obj, propName, val) {
            const key = `prop:${propName}`;
            // Only want to execute this once, the first time property is set
            restorable.once(key, () => {
                // If property existed, then we will reset it to original value,
                // otherwise we will delete it
                const oldVal = obj[propName];
                return (propName in obj)
                    ? restorable.pushUndo(() => obj[propName] = oldVal)
                    : restorable.pushUndo(() => delete obj[propName]);
            });
            // Perform the actual property assignment
            obj[propName] = val;
        }
    };
}

/**
 * @typedef {object} DOMNodeRestorableExtend
 * @prop {(targetNode: Node, fnName: string, targetfn: Function, args: any[]) => void} invoke Track method call
 * 
 * @typedef {ObjectRestorable & DOMNodeRestorableExtend} DOMNodeRestorable
 */

/**
 * Creates a Restorable which can track DOM Node property assignments and modifying method invocations.
 * Tracks methods that it knows how to undo (e.g. setAttribute, addEventListener).
 * 
 * @returns {DOMNodeRestorable}
 */
export function createDOMNodeRestorable() {
    const restorable = createObjectRestorable();
    return {
        ...restorable,
        // Track method calls
        invoke (targetNode, fnName, targetfn, args) {
            switch (fnName) {
                // For setAttribute() the undo is to reset attribute to original state
                case 'setAttribute': {
                    const [ name ] = args;
                    const key = `attr:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetNode.getAttribute(name);
                        return targetNode.hasAttribute(name)
                            ? restorable.pushUndo(() => targetNode.setAttribute(name, oldVal))
                            : restorable.pushUndo(() => targetNode.removeAttribute(name));
                    });
                    break;
                }
                // For setAttributeNS() the undo is to reset attribute to original state
                case 'setAttributeNS': {
                    const [ namespace, name ] = args;
                    const key = `attr:${namespace}:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetNode.getAttributeNS(namespace, name);
                        return targetNode.hasAttributeNS(namespace, name)
                            ? restorable.pushUndo(() => targetNode.setAttributeNS(namespace, name, oldVal))
                            : restorable.pushUndo(() => targetNode.removeAttributeNS(namespace, name));
                    });
                    break;
                }
                // For removeAttribute() the undo is to add attribute back
                case 'removeAttribute': {
                    const [ name ] = args;
                    const key = `attr:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetNode.getAttribute(name);
                        restorable.pushUndo(() => targetNode.setAttribute(name, oldVal));
                    });
                    break;
                }
                // For removeAttributeNS() the undo is to add attribute back
                case 'removeAttributeNS': {
                    const [ namespace, name ] = args;
                    const key = `attr:${namespace}:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetNode.getAttributeNS(namespace, name);
                        restorable.pushUndo(() => targetNode.setAttributeNS(namespace, name, oldVal));
                    });
                    break;
                }
                // For addEventListener the undo is to remove the event listener
                case 'addEventListener': {
                    const sameArgs = args.slice(0, 3);
                    restorable.pushUndo(() => targetNode.removeEventListener(...sameArgs));
                    break;
                }
                // For attachEvent the undo is to remove the event listener
                case 'attachEvent': {
                    const sameArgs = args.slice(0, 2);
                    restorable.pushUndo(() => targetNode.detachEvent(...sameArgs));
                    break;
                }
                default: {
                    // Debug logging for operations we might be missing
                    if (!fnName.startsWith('get') &&
                        !fnName.startsWith('has') &&
                        !fnName.startsWith('query')) {
                        debug.log(`WARNING: cannot undo operation: <${targetNode.tagName}/>.${fnName}()`);
                    }
                }
            }
            // Perform actual method invocation
            return targetfn.apply(targetNode, args);
        },
    };
}

/**
 * @typedef {object} DOMStylesRestorableExtend
 * @prop {(targetNode: Node, fnName: string, targetfn: Function, args: any[]) => void} invoke Track method call
 * 
 * @typedef {ObjectRestorable & DOMStylesRestorableExtend} DOMStylesRestorable
 */

/**
 * Creates a Restorable which can track DOM CSSStyleDeclaration modifications.
 * Tracks methods that it knows how to undo (e.g. setProperty.
 * 
 * @returns {DOMStylesRestorable}
 */
export function createDOMStylesRestorable() {
    const restorable = createObjectRestorable();
    return {
        ...restorable,
        // Track method calls
        invoke (targetStyles, fnName, targetfn, args) {
            switch (fnName) {
                // For setProperty() the undo is to reset CSS property to original state
                case 'setProperty': {
                    const [ name ] = args;
                    // NOTE: same key object property assignment, because for CSS styles
                    // object, property can be set either through dot-notation or by
                    // invoking setProperty() - they are equivalent!
                    const key = `prop:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetStyles.getPropertyValue(name);
                        const oldPriority = targetStyles.getPropertyPriority(name);
                        return restorable.pushUndo(() => targetStyles.setProperty(name, oldVal, oldPriority));    
                    });
                    break;
                }
                // For removeProperty() the undo is to restore CSS property to original state
                case 'removeProperty': {
                    const [ name ] = args;
                    const key = `prop:${name}`;
                    restorable.once(key, () => {
                        const oldVal = targetStyles.getPropertyValue(name);
                        const oldPriority = targetStyles.getPropertyPriority(name);
                        return restorable.pushUndo(() => targetStyles.setProperty(name, oldVal, oldPriority));    
                    });
                    break;
                }
            }
            // Perform actual method invocation
            return targetfn.apply(targetStyles, args);
        },
    };
}
