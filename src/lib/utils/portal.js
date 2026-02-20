/**
 * Svelte action to portal an element to the document body.
 * This is useful for modals and popups to avoid clipping from parent containers.
 * @param {HTMLElement} node 
 */
export function portal(node) {
    document.body.appendChild(node);
    return {
        destroy() {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        },
    };
}
