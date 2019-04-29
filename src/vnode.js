/**
 * @typedef {(domNode: Element) => void} VNodeOp
 */

/**
 * @typedef {'pending'|'attached'|'direct'|'detached'} VNodeState
 */

/**
 * @typedef {object} VNode
 * @property {Element} domNode
 * @property {VNode} parent
 * @property {VNodeChildren} children
 * @property {VNodeState} state
 * @property {object} data
 * @property {(fn: VNodeOp) => void} dispatch
 * @property {(targetNode: Element) => void} attach
 * @property {() => void} targetSelf
 * @property {() => void} detach
 * @property {() => void} [reconcile]
 * @property {() => void} [restore]
 */

export const VNodeState = Object.freeze({
    PENDING: 'pending',
    ATTACHED: 'attached',
    DIRECT: 'direct',
    DETACHED: 'detached'
});

const vnodeSetParent = Symbol('vnode set parent');

/**
 * 
 * @param {Element} domNode 
 * @returns {VNode}
 */
export function createVNode(domNode) {
    let _parent;
    let _children;
    let _pendingDispatch = [];
    let _targetNode;
    let _state = VNodeState.PENDING;
    let _data = {};
    const vnode = {
        get domNode() {
            return domNode;
        },
        get parent() {
            return _parent;
        },
        get children() {
            return _children || (_children = createVNodeChildren(vnode));
        },
        dispatch(fn) {
            _targetNode ? fn(_targetNode) : (_pendingDispatch && _pendingDispatch.push(fn));
        },
        targetSelf() {
            _state = VNodeState.DIRECT;
            _targetNode = domNode;
            _pendingDispatch = null;
        },
        attach(targetNode) {
            _state = VNodeState.ATTACHED;
            _targetNode = targetNode;
            _pendingDispatch && _pendingDispatch.forEach(fn => fn(_targetNode));
            _pendingDispatch = null;
        },
        detach() {
            _state = VNodeState.DETACHED;
            _targetNode = null;
            _pendingDispatch = null;
        },
        get state() {
            return _state;
        },
        get data() {
            return _data;
        },
        [vnodeSetParent](parent) {
            if (_parent && parent && _parent !== parent) {
                _parent.children.remove(vnode);
            }
            _parent = parent;
        }
    };
    return vnode;
}

/**
 * @typedef {object} VNodeChildren
 * @property {number} length
 * @property {(index: number) => VNode} item
 * @property {(vnodeChild: VNode) => void} append
 * @property {(vnodeChild: VNode, vnodeBeforeChild: VNode) => void} insertBefore
 * @property {(vnodeChild: VNode) => void} remove
 * @property {(cb: (value: VNode, index: number) => any) => any[]} map
 */

/**
 * 
 * @param {VNode} vnode Parent vnode
 */
function createVNodeChildren(vnode) {
    const _children = [];
    return {
        get length() {
            return _children.length;
        },
        item(index) {
            return _children[index];
        },
        append(vnodeChild) {
            _children.push(vnodeChild);
            vnodeChild[vnodeSetParent](vnode);
        },
        insertBefore(vnodeChild, vnodeBeforeChild) {
            const i = _children.indexOf(vnodeBeforeChild);
            _children.splice(i, 0, vnodeChild);
            vnodeChild[vnodeSetParent](vnode);
        },
        remove(vnodeChild) {
            const i = _children.indexOf(vnodeChild);
            if (i >= 0) { 
                _children.splice(i, 1);
                vnodeChild[vnodeSetParent](undefined);
            }
        },
        map(cb) {
            return _children.map(cb);
        }
    }
}
