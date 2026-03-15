import { storage }    from './storage.js';
import { langConfig } from './i18n.js';

// Single mutable state object — importez et mutez directement ses propriétés
export const state = {
    surahs:       [],
    reciters:     [],
    currentLang:  storage.get('lang', 'fr'),
    currentSurahId: null,
    lastSearchTerm: '',

    // Propriété dérivée : toujours synchronisée avec currentLang
    get selectedTranslationId() {
        return langConfig[this.currentLang].id;
    }
};
