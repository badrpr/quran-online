const BASE_URL = 'https://api.alquran.cloud/v1';

export async function fetchSurahList() {
    try {
        const res  = await fetch(`${BASE_URL}/surah`);
        const data = await res.json();
        return data.data;
    } catch (e) {
        console.error('fetchSurahList:', e);
        return [];
    }
}

export async function fetchSurahDetail(id, edition = 'quran-uthmani') {
    try {
        const res  = await fetch(`${BASE_URL}/surah/${id}/${edition}`);
        const data = await res.json();
        return data.data;
    } catch (e) {
        console.error('fetchSurahDetail:', e);
        return null;
    }
}

export async function fetchTranslation(id, lang = 'fr.hamidullah') {
    try {
        const res  = await fetch(`${BASE_URL}/surah/${id}/${lang}`);
        const data = await res.json();
        return data.data;
    } catch (e) {
        console.error('fetchTranslation:', e);
        return null;
    }
}

export async function fetchAudio(id, edition = 'ar.alafasy') {
    try {
        const res  = await fetch(`${BASE_URL}/surah/${id}/${edition}`);
        const data = await res.json();
        return data.data;
    } catch (e) {
        console.error('fetchAudio:', e);
        return null;
    }
}

export async function fetchReciters() {
    try {
        const res  = await fetch(`${BASE_URL}/edition?format=audio&type=versebyverse`);
        const data = await res.json();
        return data.data;
    } catch (e) {
        console.error('fetchReciters:', e);
        return [];
    }
}
