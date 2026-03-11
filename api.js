const BASE_URL = 'https://api.alquran.cloud/v1';

async function fetchSurahList() {
    try {
        const response = await fetch(`${BASE_URL}/surah`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching surah list:', error);
        return [];
    }
}

async function fetchSurahDetail(id, edition = 'quran-uthmani') {
    try {
        const response = await fetch(`${BASE_URL}/surah/${id}/${edition}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching surah detail:', error);
        return null;
    }
}

async function fetchTranslation(id, lang = 'fr.hamidullah') {
    try {
        const response = await fetch(`${BASE_URL}/surah/${id}/${lang}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching translation:', error);
        return null;
    }
}

async function fetchAudio(id, edition = 'ar.alafasy') {
    try {
        const response = await fetch(`${BASE_URL}/surah/${id}/${edition}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching audio:', error);
        return null;
    }
}

async function fetchReciters() {
    try {
        const response = await fetch(`${BASE_URL}/edition?format=audio&type=versebyverse`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching reciters:', error);
        return [];
    }
}

async function fetchTranslationsList() {
    try {
        const response = await fetch(`${BASE_URL}/edition?format=text&type=translation`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching translations list:', error);
        return [];
    }
}
