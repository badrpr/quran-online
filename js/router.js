export function getRoute() {
    const hash = window.location.hash;
    if (hash === '#/bookmarks') return { view: 'bookmarks' };
    const match = hash.match(/^#\/surah\/(\d+)$/);
    if (match) return { view: 'reader', id: match[1] };
    return { view: 'list' };
}

export function navigate(path) {
    window.location.hash = path;
}
