// API functions assumed to be in global scope from api.js

const app = document.getElementById('app-view');
const homeBtn = document.getElementById('home-btn');

let surahs = [];

// Router / State Management
async function init() {
    showLoading();
    surahs = await fetchSurahList();
    renderSurahList();
}

function showLoading() {
    app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

function renderSurahList(filteredSurahs = surahs) {
    const html = `
        <div class="hero">
            <h1>Le Saint Coran</h1>
            <p>Explorez les 114 sourates avec une interface moderne et élégante.</p>
        </div>
        <div class="search-container">
            <input type="text" id="search-input" class="search-bar" placeholder="Rechercher une sourate (nom ou numéro)...">
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
                        <span>${surah.englishNameTranslation} • ${surah.numberOfAyahs} Ayahs</span>
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
    showLoading();
    const [arabicData, translationData] = await Promise.all([
        fetchSurahDetail(id, 'quran-uthmani'),
        fetchTranslation(id)
    ]);

    if (!arabicData || !translationData) {
        app.innerHTML = '<div class="error">Erreur lors du chargement de la sourate.</div>';
        return;
    }

    const html = `
        <div class="reader-container">
            <div class="hero glass" style="margin-bottom: 2rem; padding: 2rem;">
                <h2 class="surah-name-ar" style="font-size: 3rem;">${arabicData.name}</h2>
                <h3 style="color: var(--accent);">${arabicData.englishName}</h3>
                <p>${arabicData.englishNameTranslation} • ${arabicData.revelationType} • ${arabicData.numberOfAyahs} Versets</p>
                
                <div class="audio-controls" style="margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <audio id="surah-audio" controls style="width: 100%; max-width: 400px;"></audio>
                    <button id="play-surah-btn" class="glass" style="padding: 0.8rem 2rem; cursor: pointer; color: white; border-radius: 50px; background: var(--primary); display: flex; align-items: center; gap: 0.5rem; border: none; font-weight: 600;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        Écouter la Sourate
                    </button>
                    <div id="audio-status" style="font-size: 0.9rem; color: var(--text-muted);">Prêt à écouter</div>
                </div>

                <button id="back-btn" class="glass" style="margin-top: 2rem; padding: 0.5rem 1rem; cursor: pointer; color: white; border-radius: 8px;">← Retour</button>
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

    playBtn.addEventListener('click', async () => {
        if (audioPlayer.src) {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
            } else {
                audioPlayer.pause();
                playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Reprendre';
            }
            return;
        }

        status.innerText = 'Chargement de l\'audio...';
        playBtn.disabled = true;
        playBtn.style.opacity = '0.5';

        const audioData = await fetchAudio(id);
        if (audioData && audioData.ayahs && audioData.ayahs.length > 0) {
            let currentAyahIndex = 0;

            const playAyah = (index) => {
                // Remove previous highlight
                document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                
                const ayahElement = document.getElementById(`ayah-${index}`);
                if (ayahElement) {
                    // Highlight current ayah
                    ayahElement.style.borderColor = 'var(--accent)';
                    // Scroll to current ayah
                    ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                audioPlayer.src = audioData.ayahs[index].audio;
                audioPlayer.play();
                status.innerText = `Lecture du verset ${index + 1}/${audioData.ayahs.length}...`;
            };

            playAyah(currentAyahIndex);
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
            playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
            
            audioPlayer.onended = () => {
                currentAyahIndex++;
                if (currentAyahIndex < audioData.ayahs.length) {
                    playAyah(currentAyahIndex);
                } else {
                    status.innerText = 'Fin de la sourate';
                    playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Écouter à nouveau';
                    document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                }
            };
        } else {
            status.innerText = 'Audio non disponible';
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
