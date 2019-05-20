import React, { createRef, useImperativeHandle, forwardRef } from 'react';

/**
 * @typedef {object} AttachProps
 * @property {string} [as]
 * @property {string} selector 
 * @property {import('react').ReactNode[]} children
 */

function AttachWithRef(props, ref) {
    const {'as': asTag, selector, children, ...otherProps} = props;
    const Tag = asTag || 'div';
    const vref = createRef();
    useImperativeHandle(ref, () => vref.current && vref.current.blendTargetNode);
    return (
        <Tag data-spice-selector={selector} ref={vref} {...otherProps}>
            {children}
        </Tag>
    );
}
AttachWithRef.displayName = 'Spice.Attach';

/**
 * Component to explicitly define how to attach to existing DOM elements.
 * @param {AttachProps} props 
 */
export const Attach = forwardRef(AttachWithRef);
