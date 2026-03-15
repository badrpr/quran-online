import { state }   from './state.js';
import { i18n }    from './i18n.js';
import { storage } from './storage.js';

// ── Daily reminder via Web Notifications ──────────────────────────────────────
// Strategy: schedule a setTimeout for today's reminder time; if the browser
// is closed before it fires, the next page-load re-schedules it automatically.

let _timer = null;

function msUntil(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const now    = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // tomorrow
    return target - now;
}

function scheduleReminder(hhmm) {
    if (_timer) clearTimeout(_timer);
    const delay = msUntil(hhmm);
    _timer = setTimeout(() => {
        const tr = i18n[state.currentLang];
        new Notification(tr.reminderNotifTitle, {
            body: tr.reminderNotifBody,
            icon: './icon.svg',
            badge: './icon.svg'
        });
        // Re-schedule for next day
        scheduleReminder(hhmm);
    }, delay);
}

export function initReminder() {
    const btn    = document.getElementById('reminder-btn');
    const label  = document.getElementById('reminder-nav-label');
    if (!btn) return;

    const notifSupported = 'Notification' in window;
    const saved = storage.get('reminderTime', null);
    if (notifSupported && saved && Notification.permission === 'granted') {
        scheduleReminder(saved);
        updateBtn(true, saved);
    } else {
        updateBtn(false, null);
    }

    btn.addEventListener('click', async () => {
        const tr = i18n[state.currentLang];
        const current = storage.get('reminderTime', null);

        // If already active → cancel
        if (current) {
            if (_timer) clearTimeout(_timer);
            _timer = null;
            storage.set('reminderTime', null);
            updateBtn(false, null);
            return;
        }

        // Check / request permission
        if (!notifSupported) return;
        let perm = Notification.permission;
        if (perm === 'default') perm = await Notification.requestPermission();
        if (perm !== 'granted') { alert(tr.reminderDenied); return; }

        // Ask for time
        const time = prompt(`${tr.reminderPromptTitle}\n${tr.reminderPromptBody}`, '08:00');
        if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return;
        const [h, m] = time.split(':').map(Number);
        if (h > 23 || m > 59) return;
        const hhmm = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

        storage.set('reminderTime', hhmm);
        scheduleReminder(hhmm);
        updateBtn(true, hhmm);
    });

    function updateBtn(active, hhmm) {
        const tr = i18n[state.currentLang];
        label.textContent = active ? `${tr.reminderOn} ${hhmm}` : tr.reminderBtn;
        btn.style.color       = active ? 'var(--accent)' : '';
        btn.style.borderColor = active ? 'var(--accent)' : '';
    }
}
