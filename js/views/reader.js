import { state }                        from '../state.js';
import { i18n }                         from '../i18n.js';
import { storage }                      from '../storage.js';
import { navigate }                     from '../router.js';
import { app, render, showLoading }     from '../dom.js';
import { fetchSurahDetail, fetchTranslation, fetchAudio } from '../api.js';
import { isBookmarked, toggleBookmark } from './bookmarks.js';

// ── Tajweed parser ────────────────────────────────────────────────────────────
function parseTajweed(text) {
    const rules = {
        h: 'ham_wasl', s: 'slnt',  l: 'slnt',  n: 'madda_normal',
        p: 'madda_permissible', m: 'madda_necessary', q: 'qlq',
        o: 'madda_obligatory',  c: 'ikhf_shfw', f: 'ikhf', w: 'idghm_shfw',
        i: 'iqlb', a: 'idgh_ghn', u: 'idgh_w_ghn', d: 'idgh_mus',
        b: 'idgh_mus', g: 'ghn'
    };
    return text.replace(/\[([a-z])[^\[]*\[([^\]]+)\]/g, (_, ruleId, content) =>
        `<span class="${rules[ruleId] || ''}">${content}</span>`
    );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const ICON_PLAY  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

// ── View ──────────────────────────────────────────────────────────────────────
export async function renderSurahReader(id) {
    const t = i18n[state.currentLang];
    state.currentSurahId = id;
    showLoading();

    const [arabicData, translationData] = await Promise.all([
        fetchSurahDetail(id, 'quran-uthmani'),
        fetchTranslation(id, state.selectedTranslationId)
    ]);

    if (!arabicData || !translationData) {
        render(app, `<div class="error">${t.error}</div>`);
        return;
    }

    const savedReciter     = storage.get('reciter', 'ar.alafasy');
    const savedReciterName = state.reciters.find(r => r.identifier === savedReciter)?.name
                             || 'Mishary Rashid Alafasy';
    const revType          = arabicData.revelationType === 'Meccan' ? t.meccan : t.medinan;

    const reciterOptions = state.reciters.map(r => {
        const sel = r.identifier === savedReciter ? 'data-selected="true"' : '';
        return `<div class="custom-option" data-value="${r.identifier}" ${sel}>
                    <span class="option-name">${r.name}</span>
                    <span class="option-sub">${r.englishName}</span>
                </div>`;
    }).join('');

    const ayahCards = arabicData.ayahs.map((ayah, index) => {
        const bookmarked  = isBookmarked(id, ayah.numberInSurah);
        const fillVal     = bookmarked ? 'currentColor' : 'none';
        const activeClass = bookmarked ? 'active' : '';
        return `<div class="ayah-card glass" id="ayah-${index}" data-ayah-num="${ayah.numberInSurah}">
                    <div class="ayah-card-header">
                        <div class="surah-number">${ayah.numberInSurah}</div>
                        <button class="bookmark-btn ${activeClass}" data-ayah="${ayah.numberInSurah}" aria-label="Marquer comme favori">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="${fillVal}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="ayah-text">${parseTajweed(ayah.text)}</div>
                    <div class="ayah-translation">${translationData.ayahs[index].text}</div>
                </div>`;
    }).join('');

    render(app, `
        <div class="reader-container">
            <div class="hero glass" style="margin-top:2rem;margin-bottom:2rem;padding:2rem;">
                <h2 class="surah-name-ar" style="font-size:3rem;">${arabicData.name}</h2>
                <h3 style="color:var(--accent);">${arabicData.englishName}</h3>
                <p>${arabicData.englishNameTranslation} &bull; ${revType} &bull; ${arabicData.numberOfAyahs} ${t.versets}</p>

                <div class="jump-to-ayah">
                    <label for="jump-input">${t.jumpLabel}</label>
                    <input type="number" id="jump-input" min="1" max="${arabicData.numberOfAyahs}" placeholder="${t.jumpPlaceholder}" class="glass">
                    <button id="jump-btn" class="glass">${t.jumpGo}</button>
                </div>

                <div class="audio-controls" style="margin-top:1.5rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">
                    <div class="custom-select-wrapper" style="width:100%;max-width:400px;">
                        <label style="font-size:0.9rem;font-weight:500;margin-bottom:0.5rem;display:block;color:var(--text-muted);">${t.reciterLabel}</label>
                        <div id="reciter-custom-select" class="custom-select glass">
                            <div class="custom-select-trigger">
                                <span id="selected-reciter-name">${savedReciterName}</span>
                                <div class="arrow"></div>
                            </div>
                            <div class="custom-options glass">${reciterOptions}</div>
                        </div>
                    </div>
                    <audio id="surah-audio" style="display:none;"></audio>
                    <button id="play-surah-btn" class="glass" style="padding:0.8rem 2rem;cursor:pointer;color:white;border-radius:50px;background:var(--primary);display:flex;align-items:center;gap:0.5rem;border:none;font-weight:600;">
                        ${ICON_PLAY} ${t.listen}
                    </button>
                    <div id="audio-status" style="font-size:0.9rem;color:var(--text-muted);">${t.ready}</div>
                </div>

                <button id="back-btn" class="glass" style="margin-top:2rem;padding:0.5rem 1rem;cursor:pointer;color:white;border-radius:8px;">${t.back}</button>
            </div>
            <div class="ayah-list">${ayahCards}</div>
        </div>
    `);

    // ── Back ──────────────────────────────────────────────────────────────────
    document.getElementById('back-btn').addEventListener('click', () => {
        if (window.history.length > 1) history.back();
        else navigate('/');
    });

    // ── Jump to ayah ──────────────────────────────────────────────────────────
    const jumpInput = document.getElementById('jump-input');
    const doJump = () => {
        const n = parseInt(jumpInput.value, 10) - 1;
        if (!isNaN(n) && n >= 0 && n < arabicData.ayahs.length)
            document.getElementById(`ayah-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    document.getElementById('jump-btn').addEventListener('click', doJump);
    jumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJump(); });

    // ── Bookmark buttons ──────────────────────────────────────────────────────
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const ayahNum = parseInt(btn.dataset.ayah, 10);
            const added   = toggleBookmark(id, ayahNum);
            btn.classList.toggle('active', added);
            btn.querySelector('svg').setAttribute('fill', added ? 'currentColor' : 'none');
        });
    });

    // ── Last read (IntersectionObserver) ──────────────────────────────────────
    const readObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting)
                storage.set('lastRead', {
                    surahId:     id,
                    ayahNum:     entry.target.dataset.ayahNum,
                    surahName:   arabicData.englishName,
                    surahNameAr: arabicData.name
                });
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.ayah-card').forEach(c => readObserver.observe(c));

    // ── Audio ─────────────────────────────────────────────────────────────────
    const audioPlayer  = document.getElementById('surah-audio');
    const playBtn      = document.getElementById('play-surah-btn');
    const status       = document.getElementById('audio-status');
    const customSelect = document.getElementById('reciter-custom-select');
    const selectedText = document.getElementById('selected-reciter-name');

    let selectedReciterId = savedReciter;
    let currentAudioData  = null;
    let currentAyahIndex  = 0;

    customSelect.querySelector('.custom-select-trigger').addEventListener('click', () => {
        customSelect.classList.toggle('open');
    });

    customSelect.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
            const val  = option.getAttribute('data-value');
            const name = option.querySelector('.option-name').innerText;
            if (val !== selectedReciterId) {
                selectedReciterId = val;
                selectedText.innerText = name;
                storage.set('reciter', val);
                customSelect.querySelectorAll('.custom-option').forEach(o => o.removeAttribute('data-selected'));
                option.setAttribute('data-selected', 'true');
                stopPlayback();
            }
            customSelect.classList.remove('open');
        });
    });

    window.addEventListener('click', e => {
        if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
    });

    const setPlayBtn = (icon, label) => render(playBtn, `${icon} ${label}`);

    const stopPlayback = () => {
        const tr = i18n[state.currentLang];
        audioPlayer.pause();
        audioPlayer.src  = '';
        currentAudioData = null;
        currentAyahIndex = 0;
        setPlayBtn(ICON_PLAY, tr.listen);
        status.innerText = tr.ready;
        document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
    };

    playBtn.addEventListener('click', async () => {
        const tr = i18n[state.currentLang];

        if (audioPlayer.src && currentAudioData) {
            if (audioPlayer.paused) {
                audioPlayer.play();
                setPlayBtn(ICON_PAUSE, tr.pause);
            } else {
                audioPlayer.pause();
                setPlayBtn(ICON_PLAY, tr.resume);
            }
            return;
        }

        status.innerText      = tr.loading;
        playBtn.disabled      = true;
        playBtn.style.opacity = '0.5';
        currentAudioData      = await fetchAudio(id, selectedReciterId);

        if (currentAudioData?.ayahs?.length > 0) {
            currentAyahIndex = 0;

            const playAyah = index => {
                const trInner = i18n[state.currentLang];
                document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                const el = document.getElementById(`ayah-${index}`);
                if (el) {
                    el.style.borderColor = 'var(--accent)';
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                audioPlayer.src  = currentAudioData.ayahs[index].audio;
                audioPlayer.play();
                status.innerText = `${trInner.ayah} ${index + 1}/${currentAudioData.ayahs.length}...`;
            };

            playAyah(currentAyahIndex);
            playBtn.disabled      = false;
            playBtn.style.opacity = '1';
            setPlayBtn(ICON_PAUSE, tr.pause);

            audioPlayer.onended = () => {
                currentAyahIndex++;
                if (currentAyahIndex < currentAudioData.ayahs.length) {
                    playAyah(currentAyahIndex);
                } else {
                    const trEnd = i18n[state.currentLang];
                    status.innerText = trEnd.fin;
                    setPlayBtn(ICON_PLAY, trEnd.reListen);
                    document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                    currentAudioData = null;
                }
            };
        } else {
            status.innerText      = tr.notAvailable;
            playBtn.disabled      = false;
            playBtn.style.opacity = '1';
        }
    });

    window.scrollTo(0, 0);

    // ── Swipe navigation (mobile) ─────────────────────────────────────────────
    let touchStartX = 0;
    const container = document.querySelector('.reader-container');
    container.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    container.addEventListener('touchend', e => {
        const delta = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(delta) < 60) return;
        const numId = parseInt(id, 10);
        if (delta < 0 && numId < 114) navigate(`/surah/${numId + 1}`);
        if (delta > 0 && numId > 1)   navigate(`/surah/${numId - 1}`);
    }, { passive: true });
}
