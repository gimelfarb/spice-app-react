/**
 * @typedef {(domNode: Element) => void} VNodeOp
 */

/**
 * @typedef {'pending'|'attached'|'direct'|'detached'} VNodeState
 */

/**
 * @typedef {object} VNode
 * @property {Element} domNode
 * @property {VNode[]} children
 * @property {VNodeState} state
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

/**
 * 
 * @param {Element} domNode 
 * @returns {VNode}
 */
export function createVNode(domNode) {
    const _children = [];
    let _pendingDispatch = [];
    let _targetNode;
    let _state = VNodeState.PENDING;
    return {
        domNode,
        children: _children,
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
        }
    };
}
