import { state }    from '../state.js';
import { i18n }     from '../i18n.js';
import { storage }  from '../storage.js';
import { navigate } from '../router.js';
import { app, render } from '../dom.js';

function surahCardHTML(surah, t) {
    return `
        <div class="surah-card glass" data-id="${surah.number}">
            <div class="surah-header">
                <div class="surah-number">${surah.number}</div>
                <div class="surah-name-ar">${surah.name}</div>
            </div>
            <div class="surah-info">
                <h3>${surah.englishName}</h3>
                <span>${surah.englishNameTranslation} &bull; ${surah.numberOfAyahs} ${t.versets}</span>
            </div>
        </div>
    `;
}

function filterSurahs(term) {
    if (!term) return state.surahs;
    const lower = term.toLowerCase();
    return state.surahs.filter(s =>
        s.englishName.toLowerCase().includes(lower) ||
        s.number.toString() === lower ||
        s.name.includes(term)
    );
}

function attachCardListeners() {
    document.querySelectorAll('.surah-card').forEach(card => {
        card.addEventListener('click', () => navigate(`/surah/${card.getAttribute('data-id')}`));
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
        <div class="search-container">
            <input type="text" id="search-input" class="search-bar"
                   placeholder="${t.searchPlaceholder}"
                   value="${state.lastSearchTerm}">
        </div>
        <div class="surah-grid">
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
