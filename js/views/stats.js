import { state }   from '../state.js';
import { i18n }    from '../i18n.js';
import { storage } from '../storage.js';
import { navigate } from '../router.js';
import { app, render } from '../dom.js';

// ── Reading stats helpers ─────────────────────────────────────────────────────
export function recordAyahRead(surahId, ayahNum, totalAyahs) {
    const stats = storage.get('stats', { ayahsRead: 0, surahsSeen: {}, firstSeen: null });
    if (!stats.firstSeen) stats.firstSeen = Date.now();
    const key = String(surahId);
    if (!stats.surahsSeen[key]) stats.surahsSeen[key] = { seen: 0, total: totalAyahs };
    // Only count each ayah once per surah
    if (ayahNum > stats.surahsSeen[key].seen) {
        stats.ayahsRead += ayahNum - stats.surahsSeen[key].seen;
        stats.surahsSeen[key].seen = ayahNum;
    }
    storage.set('stats', stats);
}

// ── Stats view ────────────────────────────────────────────────────────────────
export function renderStats() {
    const t     = i18n[state.currentLang];
    const stats = storage.get('stats', { ayahsRead: 0, surahsSeen: {}, firstSeen: null });

    const ayahsRead     = stats.ayahsRead || 0;
    const surahsStarted = Object.keys(stats.surahsSeen || {}).length;
    const totalQuranAyahs = 6236;
    const pct = Math.min(100, ((ayahsRead / totalQuranAyahs) * 100)).toFixed(1);
    // Avg recitation: ~50 ayahs / min at reading pace
    const minutesRead = Math.round(ayahsRead / 50);
    const daysSince   = stats.firstSeen
        ? Math.max(1, Math.round((Date.now() - stats.firstSeen) / 86400000))
        : 1;
    const avgPerDay   = Math.round(ayahsRead / daysSince);

    // Top surahs (most read)
    const surahMap = {};
    state.surahs.forEach(s => { surahMap[s.number] = s; });
    const topSurahs = Object.entries(stats.surahsSeen || {})
        .sort(([,a],[,b]) => b.seen - a.seen)
        .slice(0, 5)
        .map(([id, data]) => {
            const s = surahMap[parseInt(id, 10)];
            const p = Math.round((data.seen / data.total) * 100);
            return `
                <div class="stat-surah-row">
                    <div class="stat-surah-info">
                        <span class="stat-surah-name">${s ? s.englishName : id}</span>
                        <span class="stat-surah-ar" lang="ar">${s ? s.name : ''}</span>
                    </div>
                    <div class="stat-surah-bar-wrap">
                        <div class="stat-surah-bar" style="width:${p}%"></div>
                    </div>
                    <span class="stat-surah-pct">${p}%</span>
                </div>`;
        }).join('');

    render(app, `
        <div class="stats-container">
            <div class="hero glass" style="margin-top:2rem;margin-bottom:2rem;padding:2rem;">
                <h2 style="color:var(--accent);margin-bottom:1.5rem;">${t.statsTitle}</h2>

                <div class="stats-grid">
                    <div class="stat-card glass">
                        <div class="stat-value">${ayahsRead.toLocaleString()}</div>
                        <div class="stat-label">${t.statsAyahs}</div>
                    </div>
                    <div class="stat-card glass">
                        <div class="stat-value">${surahsStarted}</div>
                        <div class="stat-label">${t.statsSurahs}</div>
                    </div>
                    <div class="stat-card glass">
                        <div class="stat-value">${minutesRead}</div>
                        <div class="stat-label">${t.statsMinutes}</div>
                    </div>
                    <div class="stat-card glass">
                        <div class="stat-value">${avgPerDay}</div>
                        <div class="stat-label">${t.statsAvgDay}</div>
                    </div>
                </div>

                <div class="stat-progress-wrap" style="margin-top:1.5rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem;">
                        <span>${t.statsProgress}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="stat-progress-track">
                        <div class="stat-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;text-align:right;">
                        ${ayahsRead} / ${totalQuranAyahs} ${t.statsAyahs}
                    </div>
                </div>

                ${topSurahs ? `
                <div style="margin-top:1.5rem;">
                    <h3 style="font-size:0.9rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:1rem;">${t.statsTopSurahs}</h3>
                    ${topSurahs}
                </div>` : ''}

                <button id="back-btn-stats" class="glass" style="margin-top:2rem;padding:0.5rem 1rem;cursor:pointer;color:white;border-radius:8px;border:1px solid var(--glass-border);">${t.back}</button>
                <button id="reset-stats-btn" style="margin-top:2rem;margin-left:1rem;padding:0.5rem 1rem;cursor:pointer;color:#ef4444;background:none;border-radius:8px;border:1px solid rgba(239,68,68,0.3);font-size:0.85rem;">${t.statsReset}</button>
            </div>
        </div>
    `);

    document.getElementById('back-btn-stats').addEventListener('click', () => {
        if (window.history.length > 1) history.back();
        else navigate('/');
    });

    document.getElementById('reset-stats-btn').addEventListener('click', () => {
        const tr = i18n[state.currentLang];
        if (confirm(tr.statsResetConfirm)) {
            storage.set('stats', null);
            renderStats();
        }
    });
}
