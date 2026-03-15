export const app = document.getElementById('app-view');

/**
 * Render an HTML string into a container using DOMParser.
 * DOMParser does NOT execute inline scripts — safer than direct assignment.
 * This is the single rendering primitive used by every view.
 */
export function render(container, html) {
    const doc = new DOMParser().parseFromString(
        `<!DOCTYPE html><html><body>${html}</body></html>`,
        'text/html'
    );
    container.replaceChildren(...Array.from(doc.body.childNodes));
}

export function showLoading() {
    render(app, '<div class="loading"><div class="spinner"></div></div>');
}
