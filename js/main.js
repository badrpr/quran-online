import { state }    from './state.js';
import { i18n }     from './i18n.js';
import { storage }  from './storage.js';
import { getRoute, navigate } from './router.js';
import { render, showLoading } from './dom.js';
import { fetchSurahList, fetchReciters } from './api.js';
import { renderSurahList }    from './views/list.js';
import { renderSurahReader }  from './views/reader.js';
import { renderBookmarks }    from './views/bookmarks.js';

// ── Route handler ─────────────────────────────────────────────────────────────
async function handleRoute() {
    if (state.surahs.length === 0) return;
    const route = getRoute();
    if      (route.view === 'reader')    await renderSurahReader(route.id);
    else if (route.view === 'bookmarks') renderBookmarks();
    else                                 renderSurahList();
}

window.addEventListener('hashchange', handleRoute);

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    setupScrollHandler();
    renderLangSelector();
    showLoading();
    [state.surahs, state.reciters] = await Promise.all([
        fetchSurahList(),
        fetchReciters()
    ]);
    await handleRoute();
}

// ── Scroll handler ────────────────────────────────────────────────────────────
function setupScrollHandler() {
    const nav       = document.getElementById('main-nav');
    const scrollBtn = document.getElementById('scroll-top-btn');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
        scrollBtn.classList.toggle('visible', window.scrollY > 400);
    });
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Language selector ─────────────────────────────────────────────────────────
function renderLangSelector() {
    const container    = document.getElementById('lang-selector-container');
    const availableLangs = [
        { code: 'fr', name: 'Français' },
        { code: 'en', name: 'English'  }
    ];

    render(container, `
        <div id="lang-custom-select" class="custom-select glass header-select">
            <div class="custom-select-trigger">
                <span id="selected-lang-name">${availableLangs.find(l => l.code === state.currentLang).name}</span>
                <div class="arrow"></div>
            </div>
            <div class="custom-options glass">
                ${availableLangs.map(l => `
                    <div class="custom-option" data-value="${l.code}" ${l.code === state.currentLang ? 'data-selected="true"' : ''}>
                        <span class="option-name">${l.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `);

    const select = container.querySelector('#lang-custom-select');
    select.querySelector('.custom-select-trigger').addEventListener('click', e => {
        e.stopPropagation();
        select.classList.toggle('open');
    });

    container.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
            const newLang = option.getAttribute('data-value');
            if (newLang !== state.currentLang) {
                state.currentLang = newLang;
                storage.set('lang', state.currentLang);
                updateBookmarksNavLabel();
                renderLangSelector();
                const route = getRoute();
                if (route.view === 'reader' && state.currentSurahId) renderSurahReader(state.currentSurahId);
                else renderSurahList();
            }
        });
    });
}

function updateBookmarksNavLabel() {
    const label = document.getElementById('bookmarks-nav-label');
    if (label) label.textContent = i18n[state.currentLang].bookmarks;
}

// ── Global event listeners ────────────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', e => {
    e.preventDefault();
    navigate('/');
});

document.getElementById('bookmarks-nav-btn').addEventListener('click', () => navigate('/bookmarks'));

init();
