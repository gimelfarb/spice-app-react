import ReactDOM from 'react-dom';
import debug from './debug';
import { attachToDOM, detachFromDOM } from './attach';
import { proxyDOMObject, unwrapDOMProxyArgs, updateDOMProxy } from './proxydom';
import { createVNode } from './vnode';
import { traceUse } from './trace';

/**
 * Blend generated React DOM tree with an already existing DOM.
 * Matches each generated React DOM node with an existing one in
 * the hierarchy, and merges them together.
 * 
 * This is a replacement for ReactDOM.render() which by default
 * completely overwrites given container with generated React DOM.
 * 
 * @param {import('react').ReactNode} element 
 * @param {Element} container 
 */
export function blend(element, container) {
    const blended = blendDOMRoot(container);
    const traced = debug.enabled ? traceUse(blended, 'domRoot', { logger: debug.log, get: false }) : blended;
    ReactDOM.render(element, traced);
}

/**
 * @param {Element} domRoot 
 * @returns {Element}
 */
function blendDOMRoot(domRoot) {
    const document = domRoot.ownerDocument;
    let blendRoot = domRoot;

    // ReactDOM doesn't like rendering into <body /> directly - this is because
    // normally it completely overwrites, and so it is generally bad idea to render
    // into <body /> directly, as it may interfere with other libraries, and script
    // tags there.
    //
    // However, since we're overriding default behavior with 'blending', this no longer
    // applies, and we can safely 'blend' in the context of <body />. But because we
    // are reusing ReactDOM.render() logic, it will throw a warning. So we workaround
    // that by creating a dummy <div id="_blendRoot" />, which we will pass into the
    // ReactDOM.render() method. In reality, it will be empty, as we will redirect
    // 'blending' to the correct nodes upon .appendChild() being called.
    if (domRoot === document.documentElement || domRoot === document.body) {
        blendRoot = document.getElementById('_blendRoot');
        if (!blendRoot) {
            blendRoot = document.createElement('div');
            blendRoot.id = '_blendRoot';
            document.body.appendChild(blendRoot);
        }
    }
    return blendDOMNode(blendRoot, {
        override: {
            'appendChild': {
                invoke: (_, _fnName, _targetfn, args) => {
                    debug.log('[CALL] domRoot.appendChild*()', args);
                    const [ domChild ] = args;
                    const vtree = domChild[blendVNode];
                    attachToDOM(domRoot, vtree);
                    return domChild;
                }
            },
            'removeChild': {
                invoke: (_, _fnName, _targetfn, args) => {
                    debug.log('[CALL] domRoot.removeChild*()', args);
                    const [ domChild ] = args;
                    const vtree = domChild[blendVNode];
                    detachFromDOM(vtree);
                    return domChild;
                }
            }
        }
    });
}

const blendVNode = Symbol('blend vnode');

/**
 * @typedef {object} BlendDOMOpts
 * @prop {import('./proxydom').ProxyOverrideMap} override
 */

/**
 * 
 * @param {Element} domNode 
 * @param {BlendDOMOpts} opts 
 * @returns {Element}
 */
function blendDOMNode(domNode, opts) {
    opts = opts || {};
    const vnode = createVNode(domNode);
    const restorable = createTargetNodeRestorable();
    const blendDOMNode = proxyDOMObject(domNode, {
        override: {
            'ownerDocument': { wrap: blendDOMDocument },
            'style': { wrap: (domStyles) => blendDOMStyles(domStyles, vnode, restorable) },
            'appendChild': {
                invoke: (_, fnName, targetfn, args) => {
                    debug.log(`[CALL] <${domNode.tagName}\\>.${fnName}*()`, args);
                    const [domChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    if (vnodeChild) { 
                        vnode.children.push(vnodeChild);
                        vnodeChild.reconcile();
                        if (vnode.attached) {
                            vnode.dispatch((targetNode) => attachToDOM(targetNode, vnodeChild));
                        }
                    }
                    return targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                }
            },
            'insertBefore': {
                invoke: (_, fnName, targetfn, args) => {
                    debug.log(`[CALL] <${domNode.tagName}\\>.${fnName}*()`, args);
                    const [domChild, beforeChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    /** @type {import('./vnode').VNode} */
                    const vnodeBeforeChild = beforeChild[blendVNode];
                    if (vnodeChild) {
                        const i = vnode.children.indexOf(vnodeBeforeChild);
                        vnode.children.splice(i, 0, vnodeChild);
                        vnodeChild.reconcile();
                        if (vnode.attached) {
                            // TODO: attach doesn't take beforeChild as reference... hmmm??
                            vnode.dispatch((targetNode) => 
                                vnodeBeforeChild.dispatch((targetBefore) => attachToDOM(targetNode, vnodeChild, targetBefore)));
                        }
                    }
                    return targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                }
            },
            'removeChild': {
                invoke: (_, fnName, targetfn, args) => {
                    debug.log(`[CALL] <${domNode.tagName}\\>.${fnName}*()`, args);
                    const [domChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                    if (vnodeChild) {
                        const i = vnode.children.indexOf(vnodeChild);
                        if (i >= 0) { vnode.children.splice(i, 1); }
                        if (vnode.attached) {
                            detachFromDOM(vnodeChild);
                        }
                        vnodeChild.detach();
                    }
                    return domChild;
                }
            },
            ...opts.override,
        },
        default: {
            set: (_, propName, val) => {
                debug.log(`[SET ] <${domNode.tagName}\\>.${propName}`, val);
                vnode.dispatch((targetNode) => restorable.set(targetNode, propName, val));
                domNode[propName] = val;
            },
            invoke: (_, fnName, targetfn, args) => {
                debug.log(`[CALL] <${domNode.tagName}\\>.${fnName}()`, args);
                vnode.dispatch((targetNode) => restorable.invoke(targetNode, fnName, targetfn, args));
                return targetfn.apply(domNode, args);
            },
        },
        extend: {
            [blendVNode]: vnode,
        }
    });
    let _reconciled = false;
    vnode.reconcile = () => {
        if (_reconciled) { return; }
        _reconciled = true;
        debug.log(`reconcile: ${domNode.tagName}`);
        for (const key in blendDOMNode) {
            if (!blendDOMNode.hasOwnProperty(key)) continue;
            if (key[0] !== '_') continue;
            if (key in domNode) continue;

            debug.log('new key: ' + key);
            const val = blendDOMNode[key];
            updateDOMProxy(blendDOMNode, { propNames: [key] });
            blendDOMNode[key] = val;
        }
    };
    vnode.restore = () => {
        restorable.restore();
    };
    return blendDOMNode;
}

/**
 * 
 * @param {Document} domDocument 
 * @return {Document}
 */
function blendDOMDocument(domDocument) {
    return proxyDOMObject(domDocument, {
        override: {
            'createElement': {
                invoke: (_, _fnName, targetfn, args) => {
                    debug.log('[CALL] domRoot.ownerDocument.createElement()', args);
                    return blendDOMNode(targetfn.apply(domDocument, args));
                }
            }
        }
    });
}

/**
 * TODO: refactor...
 * 
 * @param {CSSStyleDeclaration} domStyles 
 * @param {import('./vnode').VNode} vnode 
 */
function blendDOMStyles(domStyles, vnode, restorable) {
    const restorableStyle = restorable.sub('style');
    return proxyDOMObject(domStyles, {
        override: {
            'setProperty': {
                invoke: (_, fnName, targetfn, args) => {
                    debug.log(`[CALL ] <${vnode.domNode.tagName}\\>.style.${fnName}()`, args);
                    const [propName] = args;
                    vnode.dispatch((targetNode) => {
                        restorableStyle.once(`prop:${propName}`, () => {
                            const oldVal = targetNode.style.getPropertyValue(propName);
                            const oldPriority = targetNode.style.getPropertyPriority(propName);
                            return restorable.pushUndo(() => targetNode.style.setProperty(propName, oldVal, oldPriority));    
                        });
                        targetfn.apply(targetNode, args);
                    });
                    return targetfn.apply(domStyles, args);
                }
            }
        },
        default: {
            set: (_, propName, val) => {
                debug.log(`[SET ] <${vnode.domNode.tagName}\\>.style.${propName}`, val);
                vnode.dispatch((targetNode) => restorableStyle.set(targetNode.style, propName, val));
                vnode.domNode.style[propName] = val;
            }
        }
    });
}

// TODO: move to 'restore.js'

function createRestorable() {
    const _undo = [];
    const _once = {};
    return {
        createNew() {
            return createRestorable();
        },
        once(key, cb) {
            return (key in _once) ? _once[key] : (_once[key] = cb());
        },
        sub(name) {
            return this.once('sub:' + name, () => {
                const subr = this.createNew();
                this.pushUndo(() => subr.restore());
                return subr;
            });
        },
        pushUndo(cb) {
            return _undo.push(cb);
        },
        restore() {
            _undo.forEach(cb => cb());
        }
    };
}

function createObjectRestorable() {
    const restorable = createRestorable();
    return {
        ...restorable,
        createNew () {
            return createObjectRestorable();
        },
        set (obj, propName, val) {
            const key = `prop:${propName}`;
            restorable.once(key, () => {
                const oldVal = obj[propName];
                return (propName in obj)
                    ? restorable.pushUndo(() => obj[propName] = oldVal)
                    : restorable.pushUndo(() => delete obj[propName]);
            });
            obj[propName] = val;
        }
    };
}

function createTargetNodeRestorable() {
    const restorable = createObjectRestorable();
    return {
        ...restorable,
        invoke (targetNode, fnName, targetfn, args) {
            switch (fnName) {
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
                case 'addEventListener': {
                    const sameArgs = args.slice(0, 3);
                    restorable.pushUndo(() => targetNode.removeEventListener(...sameArgs));
                    break;
                }
                case 'attachEvent': {
                    const sameArgs = args.slice(0, 2);
                    restorable.pushUndo(() => targetNode.detachEvent(...sameArgs));
                    break;
                }
                default: {
                    if (fnName.startsWith('get') || fnName.startsWith('has')) {
                        debug.log(`WARNING: cannot undo operation: <${targetNode.tagName}/>${fnName}()`);
                    }
                }
            }
            return targetfn.apply(targetNode, args);
        },
    };
}