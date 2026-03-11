// API functions assumed to be in global scope from api.js

const app = document.getElementById('app-view');
const homeBtn = document.getElementById('home-btn');

let surahs = [];
let reciters = [];
let translations = [];
let currentLang = 'fr'; // 'fr' or 'en'
let selectedTranslationId = 'fr.hamidullah';
let currentView = 'list'; // 'list' or 'reader'
let currentSurahId = null;

const i18n = {
    fr: {
        logoName: 'Al-Quran',
        heroTitle: 'Le Saint Coran',
        heroDesc: 'Explorez les 114 sourates avec une interface moderne et élégante.',
        searchPlaceholder: 'Rechercher une sourate (nom ou numéro)...',
        versets: 'Versets',
        back: '← Retour',
        listen: 'Écouter la Sourate',
        pause: 'Pause',
        resume: 'Reprendre',
        ready: 'Prêt à écouter',
        loading: 'Chargement de l\'audio...',
        notAvailable: 'Audio non disponible pour ce récitant',
        error: 'Erreur lors du chargement de la sourate.',
        reciterLabel: 'Choisir un Récitant',
        ayah: 'Verset',
        fin: 'Fin de la sourate',
        reListen: 'Écouter à nouveau',
        meccan: 'Mecquoise',
        medinan: 'Médinoise'
    },
    en: {
        logoName: 'Al-Quran',
        heroTitle: 'The Holy Quran',
        heroDesc: 'Explore the 114 Surahs with a modern and elegant interface.',
        searchPlaceholder: 'Search for a surah (name or number)...',
        versets: 'Ayahs',
        back: '← Back',
        listen: 'Listen to Surah',
        pause: 'Pause',
        resume: 'Resume',
        ready: 'Ready to listen',
        loading: 'Loading audio...',
        notAvailable: 'Audio not available for this reciter',
        error: 'Error loading the surah.',
        reciterLabel: 'Choose a Reciter',
        ayah: 'Ayah',
        fin: 'End of Surah',
        reListen: 'Listen again',
        meccan: 'Meccan',
        medinan: 'Medinan'
    }
};

const langConfig = {
    fr: { id: 'fr.hamidullah', name: 'Français' },
    en: { id: 'en.sahih', name: 'English' }
};

// Router / State Management
async function init() {
    setupScrollHandler();
    showLoading();
    [surahs, reciters] = await Promise.all([
        fetchSurahList(),
        fetchReciters()
    ]);
    renderLangSelector();
    renderSurahList();
}

function setupScrollHandler() {
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

function renderLangSelector() {
    const container = document.getElementById('lang-selector-container');
    const availableLangs = [
        { code: 'fr', name: 'Français' },
        { code: 'en', name: 'English' }
    ];

    container.innerHTML = `
        <div id="lang-custom-select" class="custom-select glass header-select">
            <div class="custom-select-trigger">
                <span id="selected-lang-name">${currentLang === 'fr' ? 'Français' : 'English'}</span>
                <div class="arrow"></div>
            </div>
            <div class="custom-options glass">
                ${availableLangs.map(l => `
                    <div class="custom-option" data-value="${l.code}" ${l.code === currentLang ? 'data-selected="true"' : ''}>
                        <span class="option-name">${l.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    const select = container.querySelector('#lang-custom-select');
    select.querySelector('.custom-select-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        select.classList.toggle('open');
    });

    container.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
            const newLang = option.getAttribute('data-value');
            if (newLang !== currentLang) {
                currentLang = newLang;
                selectedTranslationId = langConfig[currentLang].id;
                
                // Update header logo text if needed (keeping it "Al-Quran" for now)
                
                renderLangSelector();
                if (currentView === 'reader' && currentSurahId) {
                    renderSurahReader(currentSurahId);
                } else {
                    renderSurahList();
                }
            }
        });
    });
}

function showLoading() {
    app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

function renderSurahList(filteredSurahs = surahs) {
    const t = i18n[currentLang];
    currentView = 'list';
    currentSurahId = null;
    const html = `
        <div class="hero">
            <h1>${t.heroTitle}</h1>
            <p>${t.heroDesc}</p>
        </div>
        <div class="search-container">
            <input type="text" id="search-input" class="search-bar" placeholder="${t.searchPlaceholder}">
        </div>
        <div class="surah-grid">
            ${filteredSurahs.map(surah => `
                <div class="surah-card glass" data-id="${surah.number}">
                    <div class="surah-header">
                        <div class="surah-number">${surah.number}</div>
                        <div class="surah-name-ar">${surah.name}</div>
                    </div>
                    <div class="surah-info">
                        <h3>${surah.englishName}</h3>
                        <span>${surah.englishNameTranslation} • ${surah.numberOfAyahs} ${t.versets}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    app.innerHTML = html;

    // Event Listeners
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = surahs.filter(s => 
            s.englishName.toLowerCase().includes(term) || 
            s.number.toString() === term ||
            s.name.includes(term)
        );
        document.querySelector('.surah-grid').innerHTML = filtered.map(surah => `
            <div class="surah-card glass" data-id="${surah.number}">
                <div class="surah-header">
                    <div class="surah-number">${surah.number}</div>
                    <div class="surah-name-ar">${surah.name}</div>
                </div>
                <div class="surah-info">
                    <h3>${surah.englishName}</h3>
                    <span>${surah.englishNameTranslation} • ${surah.numberOfAyahs} Ayahs</span>
                </div>
            </div>
        `).join('');
        attachCardListeners();
    });

    attachCardListeners();
}

function attachCardListeners() {
    document.querySelectorAll('.surah-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            renderSurahReader(id);
        });
    });
}

function parseTajweed(text) {
    const rules = {
        'h': 'ham_wasl',
        's': 'slnt',
        'l': 'slnt',
        'n': 'madda_normal',
        'p': 'madda_permissible',
        'm': 'madda_necessary',
        'q': 'qlq',
        'o': 'madda_obligatory',
        'c': 'ikhf_shfw',
        'f': 'ikhf',
        'w': 'idghm_shfw',
        'i': 'iqlb',
        'a': 'idgh_ghn',
        'u': 'idgh_w_ghn',
        'd': 'idgh_mus',
        'b': 'idgh_mus',
        'g': 'ghn'
    };

    // Replace [x:y[z]] with <span class="rule">z</span>
    return text.replace(/\[([a-z]):[^\[]*\[([^\]]+)\]/g, (match, identifier, content) => {
        const className = rules[identifier] || '';
        return `<span class="${className}">${content}</span>`;
    });
}

async function renderSurahReader(id) {
    const t = i18n[currentLang];
    currentView = 'reader';
    currentSurahId = id;
    showLoading();
    const [arabicData, translationData] = await Promise.all([
        fetchSurahDetail(id, 'quran-uthmani'),
        fetchTranslation(id, selectedTranslationId)
    ]);

    if (!arabicData || !translationData) {
        app.innerHTML = `<div class="error">${t.error}</div>`;
        return;
    }

    const html = `
        <div class="reader-container">
            <div class="hero glass" style="margin-top: 2rem; margin-bottom: 2rem; padding: 2rem;">
                <h2 class="surah-name-ar" style="font-size: 3rem;">${arabicData.name}</h2>
                <h3 style="color: var(--accent);">${arabicData.englishName}</h3>
                <p>${arabicData.englishNameTranslation} • ${arabicData.revelationType === 'Meccan' ? t.meccan : t.medinan} • ${arabicData.numberOfAyahs} ${t.versets}</p>
                
                <div class="audio-controls" style="margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <div class="custom-select-wrapper" style="width: 100%; max-width: 400px;">
                        <label style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem; display: block; color: var(--text-muted);">${t.reciterLabel}</label>
                        <div id="reciter-custom-select" class="custom-select glass">
                            <div class="custom-select-trigger">
                                <span id="selected-reciter-name">Mishary Rashid Alafasy</span>
                                <div class="arrow"></div>
                            </div>
                            <div class="custom-options glass">
                                ${reciters.map(r => `
                                    <div class="custom-option" data-value="${r.identifier}" ${r.identifier === 'ar.alafasy' ? 'data-selected="true"' : ''}>
                                        <span class="option-name">${r.name}</span>
                                        <span class="option-sub">${r.englishName}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <audio id="surah-audio" controls style="width: 100%; max-width: 400px;"></audio>
                    <button id="play-surah-btn" class="glass" style="padding: 0.8rem 2rem; cursor: pointer; color: white; border-radius: 50px; background: var(--primary); display: flex; align-items: center; gap: 0.5rem; border: none; font-weight: 600;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        ${t.listen}
                    </button>
                    <div id="audio-status" style="font-size: 0.9rem; color: var(--text-muted);">${t.ready}</div>
                </div>

                <button id="back-btn" class="glass" style="margin-top: 2rem; padding: 0.5rem 1rem; cursor: pointer; color: white; border-radius: 8px;">${t.back}</button>
            </div>
            <div class="ayah-list">
                ${arabicData.ayahs.map((ayah, index) => `
                    <div class="ayah-card glass" id="ayah-${index}">
                        <div class="surah-number" style="margin-bottom: 1rem;">${ayah.numberInSurah}</div>
                        <div class="ayah-text">${ayah.text}</div>
                        <div class="ayah-translation">${translationData.ayahs[index].text}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    app.innerHTML = html;

    document.getElementById('back-btn').addEventListener('click', () => {
        renderSurahList();
    });

    const audioPlayer = document.getElementById('surah-audio');
    const playBtn = document.getElementById('play-surah-btn');
    const status = document.getElementById('audio-status');
    const customSelect = document.getElementById('reciter-custom-select');
    const selectedText = document.getElementById('selected-reciter-name');
    
    let selectedReciterId = 'ar.alafasy';
    let currentAudioData = null;
    let currentAyahIndex = 0;

    // Custom Select Interactivity
    customSelect.querySelector('.custom-select-trigger').addEventListener('click', () => {
        customSelect.classList.toggle('open');
    });

    document.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
            const val = option.getAttribute('data-value');
            const name = option.querySelector('.option-name').innerText;
            
            if (val !== selectedReciterId) {
                selectedReciterId = val;
                selectedText.innerText = name;
                
                // Update selected state in UI
                document.querySelectorAll('.custom-option').forEach(opt => opt.removeAttribute('data-selected'));
                option.setAttribute('data-selected', 'true');
                
                stopPlayback();
            }
            customSelect.classList.remove('open');
        });
    });

    // Close select on outside click
    window.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });

    const stopPlayback = () => {
        const tr = i18n[currentLang];
        audioPlayer.pause();
        audioPlayer.src = '';
        currentAudioData = null;
        currentAyahIndex = 0;
        playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ${tr.listen}`;
        status.innerText = tr.ready;
        document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
    };

    playBtn.addEventListener('click', async () => {
        const tr = i18n[currentLang];
        if (audioPlayer.src && currentAudioData) {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> ${tr.pause}`;
            } else {
                audioPlayer.pause();
                playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ${tr.resume}`;
            }
            return;
        }

        status.innerText = tr.loading;
        playBtn.disabled = true;
        playBtn.style.opacity = '0.5';

        const selectedReciter = selectedReciterId;
        currentAudioData = await fetchAudio(id, selectedReciter);
        
        if (currentAudioData && currentAudioData.ayahs && currentAudioData.ayahs.length > 0) {
            currentAyahIndex = 0;

            const playAyah = (index) => {
                const trInner = i18n[currentLang];
                // Remove previous highlight
                document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                
                const ayahElement = document.getElementById(`ayah-${index}`);
                if (ayahElement) {
                    // Highlight current ayah
                    ayahElement.style.borderColor = 'var(--accent)';
                    // Scroll to current ayah
                    ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                audioPlayer.src = currentAudioData.ayahs[index].audio;
                audioPlayer.play();
                status.innerText = `${trInner.ayah} ${index + 1}/${currentAudioData.ayahs.length}...`;
            };

            playAyah(currentAyahIndex);
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
            playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> ${tr.pause}`;
            
            audioPlayer.onended = () => {
                const trEnd = i18n[currentLang];
                currentAyahIndex++;
                if (currentAyahIndex < currentAudioData.ayahs.length) {
                    playAyah(currentAyahIndex);
                } else {
                    status.innerText = trEnd.fin;
                    playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ${trEnd.reListen}`;
                    document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                    currentAudioData = null; // Allow re-fetching or re-starting
                }
            };
        } else {
            status.innerText = tr.notAvailable;
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
        }
    });
    
    window.scrollTo(0, 0);
}

homeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    renderSurahList();
});

init();
