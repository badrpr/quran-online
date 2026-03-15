import { state }    from '../state.js';
import { i18n }     from '../i18n.js';
import { storage }  from '../storage.js';
import { navigate } from '../router.js';
import { app, render } from '../dom.js';

function surahCardHTML(surah, t) {
    return `
        <div class="surah-card glass" data-id="${surah.number}"
             role="listitem" tabindex="0"
             aria-label="${surah.englishName} — ${t.surah} ${surah.number}">
            <div class="surah-header">
                <div class="surah-number" aria-hidden="true">${surah.number}</div>
                <div class="surah-name-ar" lang="ar">${surah.name}</div>
            </div>
            <div class="surah-info">
                <h3>${surah.englishName}</h3>
                <span>${surah.englishNameTranslation} &bull; ${surah.numberOfAyahs} ${t.versets}</span>
            </div>
        </div>
    `;
}

// Strip Arabic diacritics (tashkeel) + tatweel for accent-insensitive search
function stripDiacritics(str) {
    return str
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
        .replace(/\u0640/g, ''); // tatweel
}

function filterSurahs(term) {
    if (!term) return state.surahs;
    const lower       = term.toLowerCase();
    const strippedTerm = stripDiacritics(term);
    return state.surahs.filter(s =>
        s.englishName.toLowerCase().includes(lower) ||
        s.englishNameTranslation.toLowerCase().includes(lower) ||
        s.number.toString() === lower ||
        s.name.includes(term) ||
        stripDiacritics(s.name).includes(strippedTerm)
    );
}

function attachCardListeners() {
    document.querySelectorAll('.surah-card').forEach(card => {
        const go = () => navigate(`/surah/${card.getAttribute('data-id')}`);
        card.addEventListener('click', go);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
}

export function renderSurahList() {
    const t        = i18n[state.currentLang];
    state.currentSurahId = null;

    const lastRead     = storage.get('lastRead', null);
    const resumeBanner = lastRead ? `
        <div class="resume-banner glass" id="resume-banner">
            <div class="resume-info">
                <span class="resume-label">${t.resumeAt}</span>
                <span class="resume-detail">${lastRead.surahNameAr} &mdash; ${lastRead.surahName}, ${t.ayah} ${lastRead.ayahNum}</span>
            </div>
            <div class="resume-actions">
                <button class="resume-go-btn glass" id="resume-go">${t.jumpGo} ${t.resumeAt}</button>
                <button class="resume-close-btn" id="resume-close" aria-label="Fermer">&#x2715;</button>
            </div>
        </div>
    ` : '';

    render(app, `
        ${resumeBanner}
        <div class="hero">
            <h1>${t.heroTitle}</h1>
            <p>${t.heroDesc}</p>
        </div>
        <div class="search-container" role="search">
            <input type="search" id="search-input" class="search-bar"
                   placeholder="${t.searchPlaceholder}"
                   aria-label="${t.searchPlaceholder}"
                   value="${state.lastSearchTerm}">
        </div>
        <div class="surah-grid" role="list" aria-label="${t.surahListLabel}">
            ${filterSurahs(state.lastSearchTerm).map(s => surahCardHTML(s, t)).join('')}
        </div>
    `);

    if (lastRead) {
        document.getElementById('resume-go').addEventListener('click', () => navigate(`/surah/${lastRead.surahId}`));
        document.getElementById('resume-close').addEventListener('click', () => {
            storage.set('lastRead', null);
            document.getElementById('resume-banner').remove();
        });
    }

    const grid        = document.querySelector('.surah-grid');
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', e => {
        state.lastSearchTerm = e.target.value;
        render(grid, filterSurahs(state.lastSearchTerm).map(s => surahCardHTML(s, i18n[state.currentLang])).join(''));
        attachCardListeners();
    });

    attachCardListeners();

    if (state.lastSearchTerm) {
        searchInput.focus();
        searchInput.setSelectionRange(state.lastSearchTerm.length, state.lastSearchTerm.length);
    }
}
