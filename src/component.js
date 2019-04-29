import React from 'react';

/**
 * @typedef {object} AttachProps
 * @property {string} [as]
 * @property {string} selector 
 * @property {import('react').ReactNode[]} children
 */

/**
 * Component to explicitly define how to attach to existing DOM elements.
 * @param {AttachProps} props 
 */
export function Attach(props) {
    const {'as': asTag, selector, children, ...otherProps} = props;
    const Tag = asTag || 'div';
    return (
        <Tag data-spice-selector={selector} {...otherProps}>
            {children}
        </Tag>
    );
}
