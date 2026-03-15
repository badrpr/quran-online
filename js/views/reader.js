import { state }                        from '../state.js';
import { i18n }                         from '../i18n.js';
import { storage }                      from '../storage.js';
import { navigate }                     from '../router.js';
import { app, render, showLoading }     from '../dom.js';
import { fetchSurahDetail, fetchTranslation, fetchAudio, fetchTransliteration, fetchTafsir } from '../api.js';
import { isBookmarked, toggleBookmark } from './bookmarks.js';
import { recordAyahRead }               from './stats.js';

// ── Tajweed rules ──────────────────────────────────────────────────────────────
const TAJWEED_RULES = {
    h: { cls: 'ham_wasl',           fr: ['Hamza Wasl',           'Liaison silencieuse'],           en: ['Hamza Wasl',           'Silent connection']              },
    s: { cls: 'slnt',               fr: ['Lettre silencieuse',   'Ne se prononce pas'],            en: ['Silent letter',        'Not pronounced']                 },
    l: { cls: 'slnt',               fr: ['Lettre silencieuse',   'Ne se prononce pas'],            en: ['Silent letter',        'Not pronounced']                 },
    n: { cls: 'madda_normal',       fr: ['Madd normal',          'Allongement 2 temps'],           en: ['Normal Madd',          '2 beats elongation']             },
    p: { cls: 'madda_permissible',  fr: ['Madd permissible',     'Allongement 2 ou 4 temps'],      en: ['Permissible Madd',     '2 or 4 beats elongation']        },
    m: { cls: 'madda_necessary',    fr: ['Madd nécessaire',      'Allongement 6 temps'],           en: ['Necessary Madd',       '6 beats elongation']             },
    q: { cls: 'qlq',                fr: ['Qalqala',              'Vibration légère à l\'arrêt'],   en: ['Qalqala',              'Slight echo at stop']            },
    o: { cls: 'madda_obligatory',   fr: ['Madd obligatoire',     'Allongement 4 ou 5 temps'],      en: ['Obligatory Madd',      '4 or 5 beats elongation']        },
    c: { cls: 'ikhf_shfw',          fr: ['Ikhfa Shafawi',        'Nasalisation labiale cachée'],   en: ['Ikhfa Shafawi',        'Hidden labial nasalization']     },
    f: { cls: 'ikhf',               fr: ['Ikhfa',                'Prononciation cachée nasale'],   en: ['Ikhfa',                'Hidden nasal pronunciation']     },
    w: { cls: 'idghm_shfw',         fr: ['Idgham Shafawi',       'Fusion labiale avec nasalisation'], en: ['Idgham Shafawi',    'Labial merger with nasalization']},
    i: { cls: 'iqlb',               fr: ['Iqlab',                'Noun → Mim avec ghunna'],        en: ['Iqlab',                'Noon → Meem with ghunna']        },
    a: { cls: 'idgh_ghn',           fr: ['Idgham avec Ghunna',   'Fusion avec nasalisation 2t'],   en: ['Idgham with Ghunna',   'Merger with 2-beat nasalization']},
    u: { cls: 'idgh_w_ghn',         fr: ['Idgham sans Ghunna',   'Fusion sans nasalisation'],      en: ['Idgham w/o Ghunna',    'Merger without nasalization']    },
    d: { cls: 'idgh_mus',           fr: ['Idgham Mutajanisayn',  'Fusion de lettres similaires'],  en: ['Idgham Mutajanisayn',  'Merger of similar letters']      },
    b: { cls: 'idgh_mus',           fr: ['Idgham Mutajanisayn',  'Fusion de lettres similaires'],  en: ['Idgham Mutajanisayn',  'Merger of similar letters']      },
    g: { cls: 'ghn',                fr: ['Ghunna',               'Nasalisation 2 temps'],          en: ['Ghunna',               '2-beat nasalization']            }
};

function parseTajweed(text) {
    return text.replace(/\[([a-z])[^\[]*\[([^\]]+)\]/g, (_, ruleId, content) => {
        const rule = TAJWEED_RULES[ruleId];
        const label = rule ? rule.fr[0] : '';
        return `<span class="${rule?.cls || ''}" data-rule="${label}">${content}</span>`;
    });
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
const ICON_PLAY  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const ICON_LOOP  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
const ICON_SHARE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
const ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_EYE   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

// ── View ───────────────────────────────────────────────────────────────────────
export async function renderSurahReader(id) {
    const t = i18n[state.currentLang];
    state.currentSurahId = id;
    showLoading();

    const [arabicData, translationData, translitData] = await Promise.all([
        fetchSurahDetail(id, 'quran-uthmani'),
        fetchTranslation(id, state.selectedTranslationId),
        fetchTransliteration(id)
    ]);

    if (!arabicData || !translationData) {
        render(app, `<div class="error">${t.error}</div>`);
        return;
    }

    const savedReciter     = storage.get('reciter', 'ar.alafasy');
    const savedReciterName = state.reciters.find(r => r.identifier === savedReciter)?.name || 'Mishary Rashid Alafasy';
    const revType          = arabicData.revelationType === 'Meccan' ? t.meccan : t.medinan;
    const tajweedOn        = storage.get('tajweedOn', true);
    const translitOn       = storage.get('translitOn', false);
    const savedSpeed       = storage.get('audioSpeed', 1);
    const memMode          = storage.get('memMode', false);

    const reciterOptions = state.reciters.map(r => {
        const sel      = r.identifier === savedReciter ? 'data-selected="true"' : '';
        const typeTag  = r.type === 'versebyverse' ? '' : ' <span class="reciter-type-tag">sourate</span>';
        return `<div class="custom-option" data-value="${r.identifier}" data-type="${r.type}" ${sel}>
                    <span class="option-name">${r.name}${typeTag}</span>
                    <span class="option-sub">${r.englishName}</span>
                </div>`;
    }).join('');

    // ── Tajweed legend items ──────────────────────────────────────────────────
    const legendItems = Object.values(TAJWEED_RULES)
        .filter((v, i, a) => a.findIndex(x => x.cls === v.cls) === i) // deduplicate
        .map(rule => {
            const [name, desc] = state.currentLang === 'fr' ? rule.fr : rule.en;
            return `<div class="legend-item">
                <span class="legend-dot ${rule.cls}">&#x25CF;</span>
                <span class="legend-name">${name}</span>
                <span class="legend-desc">${desc}</span>
            </div>`;
        }).join('');

    // ── Ayah cards ────────────────────────────────────────────────────────────
    const ayahCards = arabicData.ayahs.map((ayah, index) => {
        const bookmarked   = isBookmarked(id, ayah.numberInSurah);
        const fillVal      = bookmarked ? 'currentColor' : 'none';
        const activeClass  = bookmarked ? 'active' : '';
        const translitText = translitData?.ayahs?.[index]?.text || '';
        const memClass     = memMode ? ' mem-hidden' : '';
        return `<div class="ayah-card glass" id="ayah-${index}" data-ayah-num="${ayah.numberInSurah}"
                     role="article" aria-label="${t.ayah} ${ayah.numberInSurah}">
                    <div class="ayah-card-header">
                        <div class="surah-number" aria-hidden="true">${ayah.numberInSurah}</div>
                        <div class="ayah-actions">
                            <button class="loop-btn icon-btn" data-index="${index}" aria-label="${t.loopAyah}" title="${t.loopAyah}">${ICON_LOOP}</button>
                            <button class="share-btn icon-btn" data-index="${index}" aria-label="${t.share}" title="${t.share}">${ICON_SHARE}</button>
                            <button class="bookmark-btn icon-btn ${activeClass}" data-ayah="${ayah.numberInSurah}"
                                    aria-label="${t.ayah} ${ayah.numberInSurah} — ${t.bookmarks}" aria-pressed="${bookmarked}">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="${fillVal}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="ayah-text${tajweedOn ? '' : ' no-tajweed'}${memClass}" lang="ar">${parseTajweed(ayah.text)}</div>
                    ${translitText ? `<div class="ayah-translit${translitOn ? '' : ' hidden'}">${translitText}</div>` : ''}
                    <div class="ayah-translation">${translationData.ayahs[index].text}</div>
                    <div class="tafsir-body hidden" data-index="${index}"></div>
                </div>`;
    }).join('');

    const speedOptions = [0.75, 1, 1.25, 1.5];

    render(app, `
        <div class="reader-container">
            <div class="hero glass" style="margin-top:2rem;margin-bottom:2rem;padding:2rem;">
                <h2 class="surah-name-ar" style="font-size:3rem;" lang="ar">${arabicData.name}</h2>
                <h3 style="color:var(--accent);">${arabicData.englishName}</h3>
                <p>${arabicData.englishNameTranslation} &bull; ${revType} &bull; ${arabicData.numberOfAyahs} ${t.versets}</p>

                <div class="jump-to-ayah">
                    <label for="jump-input">${t.jumpLabel}</label>
                    <input type="number" id="jump-input" min="1" max="${arabicData.numberOfAyahs}" placeholder="${t.jumpPlaceholder}" class="glass">
                    <button id="jump-btn" class="glass">${t.jumpGo}</button>
                </div>

                <!-- Reader toggles -->
                <div class="reader-toggles">
                    <button id="tajweed-toggle" class="toggle-btn${tajweedOn ? ' active' : ''}" aria-pressed="${tajweedOn}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
                        Tajweed
                    </button>
                    <button id="translit-toggle" class="toggle-btn${translitOn ? ' active' : ''}" aria-pressed="${translitOn}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                        ${t.translitToggle}
                    </button>
                    <button id="legend-toggle" class="toggle-btn" aria-expanded="false">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        ${t.tajweedLegend}
                    </button>
                    <button id="mem-toggle" class="toggle-btn${memMode ? ' active' : ''}" aria-pressed="${memMode}">
                        ${ICON_EYE} ${t.memMode}
                    </button>
                    <div class="speed-btns" role="group" aria-label="${t.speedLabel}">
                        <span class="speed-label">${t.speedLabel}</span>
                        ${speedOptions.map(s => `<button class="speed-btn${s === savedSpeed ? ' active' : ''}" data-speed="${s}">×${s}</button>`).join('')}
                    </div>
                </div>

                <!-- Tajweed legend -->
                <div id="tajweed-legend-panel" class="tajweed-legend glass hidden" aria-hidden="true">
                    <div class="legend-grid">${legendItems}</div>
                </div>

                <!-- Audio controls -->
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
                    <audio id="surah-audio" style="display:none;" aria-hidden="true"></audio>
                    <button id="play-surah-btn" class="glass" style="padding:0.8rem 2rem;cursor:pointer;color:white;border-radius:50px;background:var(--primary);display:flex;align-items:center;gap:0.5rem;border:none;font-weight:600;">
                        ${ICON_PLAY} ${t.listen}
                    </button>
                    <div id="audio-status" style="font-size:0.9rem;color:var(--text-muted);" aria-live="polite" aria-atomic="true">${t.ready}</div>
                </div>

                <button id="back-btn" class="glass" style="margin-top:2rem;padding:0.5rem 1rem;cursor:pointer;color:white;border-radius:8px;">${t.back}</button>
            </div>
            <div class="ayah-list">${ayahCards}</div>
        </div>
    `);

    // ── Back ───────────────────────────────────────────────────────────────────
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

    // ── Tajweed toggle ────────────────────────────────────────────────────────
    document.getElementById('tajweed-toggle').addEventListener('click', function () {
        const on = !this.classList.contains('active');
        this.classList.toggle('active', on);
        this.setAttribute('aria-pressed', String(on));
        storage.set('tajweedOn', on);
        document.querySelectorAll('.ayah-text').forEach(el => el.classList.toggle('no-tajweed', !on));
        if (!on) {
            document.getElementById('tajweed-legend-panel').classList.add('hidden');
            document.getElementById('legend-toggle').classList.remove('active');
            document.getElementById('legend-toggle').setAttribute('aria-expanded', 'false');
        }
    });

    // ── Transliteration toggle ────────────────────────────────────────────────
    document.getElementById('translit-toggle').addEventListener('click', function () {
        const on = !this.classList.contains('active');
        this.classList.toggle('active', on);
        this.setAttribute('aria-pressed', String(on));
        storage.set('translitOn', on);
        document.querySelectorAll('.ayah-translit').forEach(el => el.classList.toggle('hidden', !on));
    });

    // ── Legend toggle ─────────────────────────────────────────────────────────
    document.getElementById('legend-toggle').addEventListener('click', function () {
        const panel = document.getElementById('tajweed-legend-panel');
        const shown = !panel.classList.contains('hidden');
        panel.classList.toggle('hidden', shown);
        panel.setAttribute('aria-hidden', String(shown));
        this.classList.toggle('active', !shown);
        this.setAttribute('aria-expanded', String(!shown));
    });

    // ── Memorisation mode ─────────────────────────────────────────────────────
    document.getElementById('mem-toggle').addEventListener('click', function () {
        const on = !this.classList.contains('active');
        this.classList.toggle('active', on);
        this.setAttribute('aria-pressed', String(on));
        storage.set('memMode', on);
        document.querySelectorAll('.ayah-text').forEach(el => el.classList.toggle('mem-hidden', on));
        document.querySelectorAll('.mem-reveal-btn').forEach(b => b.classList.toggle('hidden', !on));
    });

    // Reveal individual ayah in mem mode
    document.querySelectorAll('.ayah-text').forEach((el, i) => {
        const card = el.closest('.ayah-card');
        const revealBtn = document.createElement('button');
        revealBtn.className = `mem-reveal-btn toggle-btn${memMode ? '' : ' hidden'}`;
        revealBtn.textContent = t.memReveal;
        revealBtn.addEventListener('click', () => {
            el.classList.toggle('mem-hidden');
            revealBtn.textContent = el.classList.contains('mem-hidden') ? t.memReveal : t.memHideAll;
        });
        card.querySelector('.ayah-card-header').after(revealBtn);
    });

    // ── Speed buttons ─────────────────────────────────────────────────────────
    const audioPlayer = document.getElementById('surah-audio');
    audioPlayer.playbackRate = savedSpeed;

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseFloat(btn.dataset.speed);
            storage.set('audioSpeed', speed);
            audioPlayer.playbackRate = speed;
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Bookmark buttons ──────────────────────────────────────────────────────
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const ayahNum = parseInt(btn.dataset.ayah, 10);
            const added   = toggleBookmark(id, ayahNum);
            btn.classList.toggle('active', added);
            btn.querySelector('svg').setAttribute('fill', added ? 'currentColor' : 'none');
            btn.setAttribute('aria-pressed', String(added));
        });
    });

    // ── Tafsir accordion ──────────────────────────────────────────────────────
    let tafsirCache = null;
    document.querySelectorAll('.ayah-translation').forEach((el, index) => {
        const tafsirBtn = document.createElement('button');
        tafsirBtn.className = 'tafsir-toggle-btn';
        tafsirBtn.textContent = `▸ ${t.tafsirToggle}`;
        tafsirBtn.setAttribute('aria-expanded', 'false');
        tafsirBtn.addEventListener('click', async () => {
            const body = document.querySelector(`.tafsir-body[data-index="${index}"]`);
            const open = !body.classList.contains('hidden');
            if (open) {
                body.classList.add('hidden');
                tafsirBtn.textContent = `▸ ${t.tafsirToggle}`;
                tafsirBtn.setAttribute('aria-expanded', 'false');
                return;
            }
            if (!tafsirCache) {
                body.textContent = t.tafsirLoading;
                body.classList.remove('hidden');
                tafsirCache = await fetchTafsir(id);
            }
            const tafsirText = tafsirCache?.ayahs?.[index]?.text || '—';
            body.textContent = tafsirText;
            body.classList.remove('hidden');
            tafsirBtn.textContent = `▾ ${t.tafsirToggle}`;
            tafsirBtn.setAttribute('aria-expanded', 'true');
        });
        el.after(tafsirBtn);
    });

    // ── Last read (IntersectionObserver) ──────────────────────────────────────
    const readObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                recordAyahRead(id, parseInt(entry.target.dataset.ayahNum, 10), arabicData.ayahs.length);
                storage.set('lastRead', {
                    surahId:     id,
                    ayahNum:     entry.target.dataset.ayahNum,
                    surahName:   arabicData.englishName,
                    surahNameAr: arabicData.name
                });
            }
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.ayah-card').forEach(c => readObserver.observe(c));

    // ── Audio state ───────────────────────────────────────────────────────────
    const playBtn      = document.getElementById('play-surah-btn');
    const status       = document.getElementById('audio-status');
    const customSelect = document.getElementById('reciter-custom-select');
    const selectedText = document.getElementById('selected-reciter-name');

    let selectedReciterId = savedReciter;
    let currentAudioData  = null;
    let currentAyahIndex  = 0;
    let loopAyahIndex     = -1;

    const setPlayBtn = (icon, label) => render(playBtn, `${icon} ${label}`);

    const playAyah = index => {
        const tr = i18n[state.currentLang];
        document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
        const el = document.getElementById(`ayah-${index}`);
        if (el) {
            el.style.borderColor = 'var(--accent)';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        audioPlayer.src          = currentAudioData.ayahs[index].audio;
        audioPlayer.playbackRate = storage.get('audioSpeed', 1);
        audioPlayer.play();
        status.innerText = `${tr.ayah} ${index + 1} / ${currentAudioData.ayahs.length}`;
    };

    const stopPlayback = () => {
        const tr = i18n[state.currentLang];
        audioPlayer.pause();
        audioPlayer.src  = '';
        currentAudioData = null;
        currentAyahIndex = 0;
        loopAyahIndex    = -1;
        setPlayBtn(ICON_PLAY, tr.listen);
        status.innerText = tr.ready;
        document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
        document.querySelectorAll('.loop-btn').forEach(b => b.classList.remove('active'));
    };

    // ── Loop buttons ──────────────────────────────────────────────────────────
    document.querySelectorAll('.loop-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index, 10);
            if (loopAyahIndex === idx) {
                loopAyahIndex = -1;
                btn.classList.remove('active');
            } else {
                document.querySelectorAll('.loop-btn').forEach(b => b.classList.remove('active'));
                loopAyahIndex = idx;
                btn.classList.add('active');
                if (currentAudioData?.ayahs?.[idx]) {
                    currentAyahIndex = idx;
                    playAyah(idx);
                    setPlayBtn(ICON_PAUSE, i18n[state.currentLang].pause);
                }
            }
        });
    });

    // ── Share buttons ─────────────────────────────────────────────────────────
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const tr    = i18n[state.currentLang];
            const idx   = parseInt(btn.dataset.index, 10);
            const ayah  = arabicData.ayahs[idx];
            const trans = translationData.ayahs[idx];
            const text  = `${ayah.text}\n\n${trans.text}\n\n— ${arabicData.englishName}, ${tr.ayah} ${ayah.numberInSurah}`;
            if (navigator.share) {
                try { await navigator.share({ title: `Al-Quran — ${arabicData.englishName}`, text }); } catch {}
            } else {
                try { await navigator.clipboard.writeText(text); } catch {}
                render(btn, ICON_CHECK);
                btn.style.color = 'var(--accent)';
                setTimeout(() => { render(btn, ICON_SHARE); btn.style.color = ''; }, 1800);
            }
        });
    });

    // ── Reciter selector ─────────────────────────────────────────────────────
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

    // ── Play / Pause button ───────────────────────────────────────────────────
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

        const reciterInfo = state.reciters.find(r => r.identifier === selectedReciterId);
        const isVBV       = reciterInfo?.type === 'versebyverse';

        if (isVBV) {
            // ── Verse-by-verse: play ayah by ayah ────────────────────────────
            currentAudioData = await fetchAudio(id, selectedReciterId);

            if (currentAudioData?.ayahs?.length > 0) {
                currentAyahIndex = 0;
                playAyah(currentAyahIndex);
                playBtn.disabled      = false;
                playBtn.style.opacity = '1';
                setPlayBtn(ICON_PAUSE, tr.pause);

                audioPlayer.onended = () => {
                    if (loopAyahIndex >= 0) {
                        playAyah(loopAyahIndex);
                    } else {
                        currentAyahIndex++;
                        if (currentAyahIndex < currentAudioData.ayahs.length) {
                            playAyah(currentAyahIndex);
                        } else {
                            const trEnd = i18n[state.currentLang];
                            status.innerText = trEnd.fin;
                            setPlayBtn(ICON_PLAY, trEnd.reListen);
                            document.querySelectorAll('.ayah-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
                            document.querySelectorAll('.loop-btn').forEach(b => b.classList.remove('active'));
                            currentAudioData = null;
                            loopAyahIndex    = -1;
                        }
                    }
                };
            } else {
                status.innerText      = tr.notAvailable;
                playBtn.disabled      = false;
                playBtn.style.opacity = '1';
            }
        } else {
            // ── Complete surah: single MP3 ────────────────────────────────────
            const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${selectedReciterId}/${id}.mp3`;
            currentAudioData = { complete: true };
            audioPlayer.src          = audioUrl;
            audioPlayer.playbackRate = storage.get('audioSpeed', 1);
            audioPlayer.play();
            playBtn.disabled      = false;
            playBtn.style.opacity = '1';
            setPlayBtn(ICON_PAUSE, tr.pause);
            status.innerText = arabicData.englishName;

            audioPlayer.onerror = () => {
                status.innerText = tr.notAvailable;
                setPlayBtn(ICON_PLAY, tr.listen);
                currentAudioData = null;
            };
            audioPlayer.onended = () => {
                const trEnd = i18n[state.currentLang];
                status.innerText = trEnd.fin;
                setPlayBtn(ICON_PLAY, trEnd.reListen);
                currentAudioData = null;
            };
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

    // ── Background prefetch of adjacent surahs ────────────────────────────────
    const numId = parseInt(id, 10);
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => prefetchAdjacentSurahs(numId), { timeout: 3000 });
    } else {
        setTimeout(() => prefetchAdjacentSurahs(numId), 2000);
    }
}

function prefetchAdjacentSurahs(numId) {
    const ids = [];
    if (numId > 1)   ids.push(numId - 1);
    if (numId < 114) ids.push(numId + 1);
    ids.forEach(adjId => {
        fetch(`https://api.alquran.cloud/v1/surah/${adjId}/quran-uthmani`).catch(() => {});
    });
}
