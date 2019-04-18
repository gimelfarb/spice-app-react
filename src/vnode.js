/**
 * @typedef {(domNode: Element) => void} VNodeOp
 */

/**
 * @typedef {object} VNode
 * @property {Element} domNode
 * @property {VNode[]} children
 * @property {boolean} attached
 * @property {(fn: VNodeOp) => void} dispatch
 * @property {(targetNode: Element) => void} attach
 * @property {() => void} detach
 * @property {() => void} [reconcile]
 * @property {() => void} [restore]
 */

/**
 * 
 * @param {Element} domNode 
 * @returns {VNode}
 */
export function createVNode(domNode) {
    const _children = [];
    let _pendingDispatch = [];
    let _targetNode;
    return {
        domNode,
        children: _children,
        dispatch(fn) {
            _targetNode ? fn(_targetNode) : (_pendingDispatch && _pendingDispatch.push(fn));
        },
        attach(targetNode) {
            _targetNode = targetNode;
            _pendingDispatch && _pendingDispatch.forEach(fn => fn(_targetNode));
            _pendingDispatch = null;
        },
        detach() {
            _targetNode = null;
            _pendingDispatch = null;
        },
        get attached() {
            return !!_targetNode;
        }
    };
}
