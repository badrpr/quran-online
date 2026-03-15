import { state }   from '../state.js';
import { i18n }    from '../i18n.js';
import { storage } from '../storage.js';
import { navigate } from '../router.js';
import { app, render } from '../dom.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getBookmarks() {
    return storage.get('bookmarks', {});
}

export function isBookmarked(surahId, ayahNum) {
    const bm = getBookmarks();
    return (bm[String(surahId)] || []).includes(ayahNum);
}

export function toggleBookmark(surahId, ayahNum) {
    const bm  = getBookmarks();
    const key = String(surahId);
    if (!bm[key]) bm[key] = [];
    const idx = bm[key].indexOf(ayahNum);
    if (idx >= 0) bm[key].splice(idx, 1);
    else bm[key].push(ayahNum);
    if (bm[key].length === 0) delete bm[key];
    storage.set('bookmarks', bm);
    return idx < 0; // true = ajouté
}

// ── View ──────────────────────────────────────────────────────────────────────
export function renderBookmarks() {
    const t      = i18n[state.currentLang];
    const bm     = getBookmarks();
    const keys   = Object.keys(bm).filter(k => bm[k].length > 0);
    const surahMap = {};
    state.surahs.forEach(s => { surahMap[s.number] = s; });

    const content = keys.length === 0
        ? `<p class="bookmarks-empty" role="status">${t.noBookmarks}</p>`
        : keys.map(surahId => {
            const surah = surahMap[parseInt(surahId, 10)];
            return `
                <div class="glass bookmark-group">
                    <div class="bookmark-group-header" data-id="${surahId}">
                        <div class="surah-number">${surahId}</div>
                        <div>
                            <div class="bookmark-surah-name">${surah ? surah.englishName : ''}</div>
                            <div class="surah-name-ar" lang="ar" style="font-size:1.1rem;">${surah ? surah.name : ''}</div>
                        </div>
                        <svg class="bookmark-group-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                    <div class="bookmark-ayahs">
                        ${bm[surahId].slice().sort((a, b) => a - b).map(ayahNum => `
                            <div class="bookmark-ayah-row">
                                <span class="bookmark-ayah-label">${t.ayah} ${ayahNum}</span>
                                <div class="bookmark-ayah-actions">
                                    <button class="bm-goto glass" data-surah="${surahId}" data-ayah="${ayahNum}">${t.jumpGo}</button>
                                    <button class="bm-remove" data-surah="${surahId}" data-ayah="${ayahNum}" aria-label="${t.removeBookmark}">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

    render(app, `
        <div class="bookmarks-container">
            <div class="hero" style="margin-bottom: 2rem;">
                <h1>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" stroke-width="1.5" style="vertical-align:middle;margin-right:0.5rem;">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    ${t.bookmarksTitle}
                </h1>
            </div>
            <button id="back-btn-bm" class="glass" style="margin-bottom:2rem; padding:0.5rem 1rem; cursor:pointer; color:white; border-radius:8px; border:1px solid var(--glass-border);">${t.back}</button>
            ${content}
        </div>
    `;

    document.getElementById('back-btn-bm').addEventListener('click', () => {
        if (window.history.length > 1) history.back();
        else navigate('/');
    });

    document.querySelectorAll('.bookmark-group-header').forEach(h => {
        h.addEventListener('click', () => navigate(`/surah/${h.dataset.id}`));
    });

    document.querySelectorAll('.bm-goto').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            navigate(`/surah/${btn.dataset.surah}`);
        });
    });

    document.querySelectorAll('.bm-remove').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            toggleBookmark(btn.dataset.surah, parseInt(btn.dataset.ayah, 10));
            renderBookmarks();
        });
    });
}
