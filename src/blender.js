import ReactDOM from 'react-dom';
import debug from './debug';
import { traceUse } from './trace';
import { attachToDOM, detachFromDOM } from './attach';
import { proxyDOMObject, unwrapDOMProxyArgs, updateDOMProxy } from './proxydom';
import { createVNode, VNodeState } from './vnode';
import { createDOMNodeRestorable, createDOMStylesRestorable } from './restore';
import { createOnce } from './once';

/**
 * @typedef BlendOpts
 * @property {boolean} traceUse enable low-level tracing (useful for spice-app own development)
 */

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
 * @param {BlendOpts} [opts]
 */
export function blend(element, container, opts) {
    const blended = blendDOMRoot(container);
    const traced = (debug.enabled && opts && opts.traceUse)
        ? traceUse(blended, 'domRoot', { logger: debug.log, get: false, untraceFuncArgs: true }) 
        : blended;
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

    const vnodeRoot = createVNode(domRoot);
    vnodeRoot.targetSelf();
    
    return blendDOMNode(blendRoot, {
        override: {
            'appendChild': {
                invoke: (_, _fnName, _targetfn, args) => {
                    vnodeRoot.data['log'] && debug.log('[CALL] domRoot.appendChild*()', args);
                    const [ domChild ] = args;
                    const vnodeChild = domChild[blendVNode];
                    vnodeChild.reconcile();
                    vnodeRoot.children.append(vnodeChild);
                    attachToDOM(vnodeChild);
                    return domChild;
                }
            },
            'insertBefore': {
                invoke: (_, _fnName, _targetfn, args) => {
                    vnodeRoot.data['log'] && debug.log('[CALL] domRoot.insertBefore*()', args);
                    const [ domChild, beforeChild ] = args;
                    const vnodeChild = domChild[blendVNode];
                    const vnodeBeforeChild = beforeChild[blendVNode];
                    vnodeChild.reconcile();
                    vnodeRoot.children.insertBefore(vnodeChild, vnodeBeforeChild);
                    attachToDOM(vnodeChild, vnodeBeforeChild);
                    return domChild;
                }
            },
            'removeChild': {
                invoke: (_, _fnName, _targetfn, args) => {
                    vnodeRoot.data['log'] && debug.log('[CALL] domRoot.removeChild*()', args);
                    const [ domChild ] = args;
                    const vnodeChild = domChild[blendVNode];
                    detachFromDOM(vnodeChild);
                    vnodeRoot.children.remove(vnodeChild);
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
    const restorable = createDOMNodeRestorable();
    const once = createOnce();
    const blendDOMNode = proxyDOMObject(domNode, {
        override: {
            'ownerDocument': { 
                get: (_, propName) => once(propName, () => blendDOMDocument(vnode))
            },
            'style': { 
                get: (_, propName) => once(propName, () => blendDOMStyles(vnode, restorable))
            },
            'appendChild': {
                invoke: (_, fnName, targetfn, args) => {
                    vnode.data['log'] && debug.log(`[CALL] <${domNode.tagName}/>.${fnName}*()`, args);
                    const [domChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    if (vnodeChild) { 
                        vnode.children.append(vnodeChild);
                        vnodeChild.reconcile();
                        if (vnode.state !== VNodeState.PENDING) {
                            checkVNodeNotDetached(vnode);
                            attachToDOM(vnodeChild);
                            return domChild;
                        }
                    }
                    targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                    return domChild;
                }
            },
            'insertBefore': {
                invoke: (_, fnName, targetfn, args) => {
                    vnode.data['log'] && debug.log(`[CALL] <${domNode.tagName}/>.${fnName}*()`, args);
                    const [domChild, beforeChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    /** @type {import('./vnode').VNode} */
                    const vnodeBeforeChild = beforeChild[blendVNode];
                    if (vnodeChild) {
                        vnode.children.insertBefore(vnodeChild, vnodeBeforeChild);
                        vnodeChild.reconcile();
                        if (vnode.state !== VNodeState.PENDING) {
                            checkVNodeNotDetached(vnode);
                            checkVNodeNotDetached(vnodeBeforeChild);
                            attachToDOM(vnodeChild, vnodeBeforeChild);
                            return domChild;
                        }
                    }
                    targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                    return domChild;
                }
            },
            'removeChild': {
                invoke: (_, fnName, targetfn, args) => {
                    vnode.data['log'] && debug.log(`[CALL] <${domNode.tagName}/>.${fnName}*()`, args);
                    const [domChild] = args;
                    /** @type {import('./vnode').VNode} */
                    const vnodeChild = domChild[blendVNode];
                    if (vnodeChild) {
                        vnode.children.remove(vnodeChild);
                        if (vnode.state !== VNodeState.PENDING) {
                            checkVNodeNotDetached(vnode);
                            detachFromDOM(vnodeChild);
                            return domChild;
                        }
                        vnodeChild.detach();
                    }
                    targetfn.apply(domNode, unwrapDOMProxyArgs(args));
                    return domChild;
                }
            },
            ...opts.override,
        },
        default: {
            set: (_, propName, val) => {
                vnode.data['log'] && debug.log(`[SET ] <${domNode.tagName}/>.${propName}`, val);
                if (vnode.state !== VNodeState.DIRECT) {
                    checkVNodeNotDetached(vnode);
                    vnode.dispatch((targetNode) => restorable.set(targetNode, propName, val));
                }
                domNode[propName] = val;
            },
            invoke: (_, fnName, targetfn, args) => {
                vnode.data['log'] && debug.log(`[CALL] <${domNode.tagName}/>.${fnName}()`, args);
                if (vnode.state !== VNodeState.DIRECT) {
                    checkVNodeNotDetached(vnode);
                    if (interceptDOMNodeInvoke(vnode, fnName, targetfn, args)) return;
                    vnode.dispatch((targetNode) => restorable.invoke(targetNode, fnName, targetfn, args));
                }
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
        vnode.data['log'] && debug.log(`reconcile: ${domNode.tagName}`);
        for (const key in blendDOMNode) {
            if (!blendDOMNode.hasOwnProperty(key)) continue;
            if (key[0] !== '_') continue;
            if (key in domNode) continue;

            vnode.data['log'] && debug.log('new key: ' + key);
            const val = blendDOMNode[key];
            updateDOMProxy(blendDOMNode, { propNames: [key] });
            blendDOMNode[key] = val;
        }
    };
    vnode.restore = () => {
        restorable.restore();
    };
    vnode.toString = () => `<${domNode.tagName}/>`;
    return blendDOMNode;
}

function blendDOMTextNode(domTextNode) {
    const vnode = createVNode(domTextNode);
    const once = createOnce();
    const blendDOMTextNode = proxyDOMObject(domTextNode, {
        override: {
            'ownerDocument': { 
                get: (_, propName) => once(propName, () => blendDOMDocument(vnode))
            },
        },
        extend: {
            [blendVNode]: vnode,
        }
    });
    vnode.reconcile = () => {};
    vnode.toString = () => `text("${domTextNode.wholeText}")`;
    return blendDOMTextNode;
}

/**
 * 
 * @param {import('./vnode').VNode} vnode 
 * @return {Document}
 */
function blendDOMDocument(vnode) {
    const domNode = vnode.domNode;
    const domDocument = domNode.ownerDocument;
    return proxyDOMObject(domDocument, {
        override: {
            'createElement': {
                invoke: (_, _fnName, targetfn, args) => {
                    vnode.data['log'] && debug.log('[CALL] domRoot.ownerDocument.createElement()', args);
                    return blendDOMNode(targetfn.apply(domDocument, args));
                }
            },
            'createTextNode': {
                invoke: (_, _fnName, targetfn, args) => {
                    vnode.data['log'] && debug.log('[CALL] domRoot.ownerDocument.createTextNode()', args);
                    return blendDOMTextNode(targetfn.apply(domDocument, args));
                }
            }
        }
    });
}

/**
 * Setup tracking proxy for the CSSStyleDeclaration (node.style) object,
 * to track CSS style changes.
 * 
 * @param {import('./vnode').VNode} vnode 
 * @param {import('./restore').Restorable} restorable
 */
function blendDOMStyles(vnode, restorable) {
    /** @type {import('./restore').DOMStylesRestorable} */
    const restorableStyle = restorable.sub('style', createDOMStylesRestorable);
    const domNode = vnode.domNode;
    return proxyDOMObject(domNode.style, {
       default: {
            set: (_, propName, val) => {
                vnode.data['log'] && debug.log(`[SET ] <${domNode.tagName}/>.style.${propName}`, val);
                if (vnode.state !== VNodeState.DIRECT) {
                    checkVNodeNotDetached(vnode);
                    vnode.dispatch((targetNode) => restorableStyle.set(targetNode.style, propName, val));
                }
                domNode.style[propName] = val;
            },
            invoke: (_, fnName, targetfn, args) => {
                vnode.data['log'] && debug.log(`[CALL] <${domNode.tagName}/>.style.${fnName}()`, args);
                if (vnode.state !== VNodeState.DIRECT) {
                    checkVNodeNotDetached(vnode);
                    vnode.dispatch((targetNode) => restorableStyle.invoke(targetNode.style, fnName, targetfn, args));
                }
                return targetfn.apply(domNode.style, args);
            },
        }
    });
}

/**
 * Check VNode is not detached - log warning
 * @param {import('./vnode').VNode} vnode 
 */
function checkVNodeNotDetached(vnode) {
    (vnode.state !== VNodeState.DETACHED)
        || debug.log(`WARNING: Attempt to use detached vnode (${vnode.toString()})`);
}

const SPICE_DATA_ATTR_PREFIX = 'data-spice-';

/**
 * Intercept certain DOM calls (like setAttribute) to manipulate
 * internal Spice data.
 * 
 * @param {import('./vnode').VNode} vnode 
 * @param {string} fnName 
 * @param {Function} _targetfn 
 * @param {any[]} args 
 */
function interceptDOMNodeInvoke(vnode, fnName, _targetfn, args) {
    if (fnName === 'setAttribute') {
        const [name, value] = args;
        if (name && name.startsWith(SPICE_DATA_ATTR_PREFIX)) {
            const key = name.substring(SPICE_DATA_ATTR_PREFIX.length);
            vnode.data[key] = value;
            return true;
        }
    }
}
