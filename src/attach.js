import debug from './debug';
import { VNodeState } from './vnode';

/**
 * Recursively blends the generated React (v)DOM tree with the
 * real existing DOM, by locating and matching nodes to merge.
 * 
 * @param {import('./vnode').VNode} vtree
 * @param {import('./vnode').VNode} [vtreeBefore]
 */
export function attachToDOM(vtree, vtreeBefore) {
    // Use a stack array for recursive traversal
    const stack = [{ vnode: vtree, vnodeBefore: vtreeBefore }];

    while (stack.length) {
        const { vnode, vnodeBefore } = stack.shift();
        if (vnode.state !== VNodeState.PENDING) {
            debug.log(`WARNING: Tried to attach non-pending vnode (state = ${vnode.state})`, vnode.toString());
            continue;
        }
        if (!vnode.parent) {
            debug.log('WARNING: Tries to attach unparented vnode - something is wrong ...', vnode.toString());
            continue;
        }

        placeIntoDOM(vnode, vnodeBefore);
        
        if (vnode.state === VNodeState.ATTACHED) {
            // Add children to the stack array to process recursively
            if (vnode.children && vnode.children.length) {
                const child_frames = vnode.children.map(c => ({ vnode: c }));
                stack.push(...child_frames);
            }
        }
    }
}

/**
 * 
 * @param {import('./vnode').VNode} vtree 
 */
export function detachFromDOM(vtree) {
    const stack = [{ vnode: vtree }];
    while (stack.length) {
        const { vnode } = stack.shift();
        if (vnode.state === VNodeState.DIRECT) {
            debug.log(`Detach - removing: ${vnode.toString()}`);
            vnode.domNode.parentNode.removeChild(vnode.domNode);
        } else if (vnode.state === VNodeState.ATTACHED) {
            debug.log(`Detach - restoring: ${vnode.toString()}`);
            vnode.restore && vnode.restore();

            if (vnode.children && vnode.children.length) {
                const child_frames = vnode.children.map(c => ({ vnode: c }));
                stack.push(...child_frames);
            }
        }

        vnode.detach();
    }
}

/**
 * 
 * @param {import('./vnode').VNode} vnode 
 * @param {import('./vnode').VNode} [vnodeBefore]
 */
function placeIntoDOM(vnode, vnodeBefore) {
    const domNode = vnode.domNode;
    const isElement = domNode.nodeType === Node.ELEMENT_NODE;

    if (isElement) {
        placeElementIntoDOM(vnode, vnodeBefore);
    } else {
        placeOtherIntoDOM(vnode, vnodeBefore);
    }
}

/**
 * 
 * @param {import('./vnode').VNode} vnode 
 * @param {import('./vnode').VNode} [vnodeBefore]
 */
function placeElementIntoDOM(vnode, vnodeBefore) {
    const domCtx = getTargetNode(vnode.parent);
    const selector = vnode.data['selector'] || makeSelector(vnode.domNode);
    const mustAttach = !!vnode.data['selector'];
    const attachNode = selector && domCtx.querySelector(selector);
    if (!attachNode) {
        // If cannot find, then just insert the new DOM node
        // that was generated by React
        selector && debug.log(`Not found: ${selector}`, domCtx);
        if (!mustAttach) {
            if (vnodeBefore) {
                domCtx.insertBefore(vnode.domNode, getTargetNode(vnodeBefore));
            } else {
                domCtx.appendChild(vnode.domNode);
            }
            vnode.targetSelf();
        }
    } else {
        // Found matching node, so we'll perform a merge
        debug.log(`Attaching to existing: ${selector}`);
        vnode.attach(attachNode);
    }    
}

/**
 * 
 * @param {import('./vnode').VNode} vnode 
 * @param {import('./vnode').VNode} [vnodeBefore]
 */
function placeOtherIntoDOM(vnode, vnodeBefore) {
    const vnodeParent = vnode.parent;
    ensureCleanSlate(vnodeParent);
    
    const domCtx = getTargetNode(vnodeParent);
    const domNode = vnode.domNode;
    const isText = domNode.nodeType === Node.TEXT_NODE;
    if (vnodeBefore) {
        const domNodeBefore = getTargetNode(vnodeBefore);
        isText && debug.log(`Placing text "${domNode.wholeText}" before "${domNodeBefore.wholeText}"`);
        domCtx.insertBefore(domNode, domNodeBefore);
    } else {
        isText && debug.log(`Placing text "${domNode.wholeText}"`);
        domCtx.appendChild(domNode);
    }

    vnode.targetSelf();
}

/**
 * Selector for locating existing DOM elements to merge with.
 * 
 * @param {Element} domNode 
 * @returns {string}
 */
function makeSelector(domNode) {
    // If we have an id attribute, then it trumps all others
    if (domNode.id && typeof domNode.id === 'string') {
        return `${domNode.tagName}#${domNode.id}`;
    // Alternatively, we can have a name attribute, which is 2nd best
    } else if (domNode.name && typeof domNode.name === 'string') {
        return `${domNode.tagName}[name="${domNode.name}"]`;
    } else {
        switch (domNode.tagName.toLowerCase()) {
            case 'button':
            case 'input':
                // We might match a input/button by 'type' attribute, but it only
                // works if there are not multiple elements of same type
                if (domNode.type) {
                    return `${domNode.tagName}[type="${domNode.type}"]`;
                }
                break;
            case 'label':
                // We can match a <label /> by the 'for' attribute
                if (domNode.htmlFor) {
                    return `${domNode.tagName}[for="${domNode.htmlFor}"]`;
                }
                break;
        }
    }
    // Default is to give up, and create a new element
    return;
}

/**
 * Returns target DOM node to which VNode is attached, if any.
 * @param {import('./vnode').VNode} vnode 
 */
function getTargetNode(vnode) {
    let targetNode;
    if (vnode.state !== VNodeState.PENDING) {
        vnode.dispatch((target) => targetNode = target);
    }
    return targetNode;
}

const markerCleanSlate = Symbol('marker clean slate');

/**
 * Makes sure that target node is clear of any previous children, and that
 * they will be restored when vnode is detached.
 * @param {import('./vnode').VNode} vnode 
 */
function ensureCleanSlate(vnode) {
    if (!vnode[markerCleanSlate]) {
        vnode[markerCleanSlate] = true;
        vnode.dispatch((targetNode) => {
            const childNodes = Array.prototype.slice.call(targetNode.childNodes);
            childNodes.forEach(c => c.remove());
            const _restore = vnode.restore;
            vnode.restore = () => {
                childNodes.forEach(c => targetNode.appendChild(c));
                _restore && _restore();
            };
        });
    }
}
