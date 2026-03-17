// ── Tajweed Parser — based on AlQuran Cloud (jsfiddle.net/s20qcwph) ────────────
// Parses tajweed-annotated text from the quran-tajweed edition and produces
// <tajweed> HTML elements with class, data-type, data-description, data-tajweed.

export class Tajweed {
    constructor() {
        this.meta = [];
        this.createMetaData();
    }

    createMetaData() {
        this.meta = [
            { identifier: '[h', type: 'hamza-wasl',                description: 'Hamzat ul Wasl',                        default_css_class: 'ham_wasl',          html_color: '#AAAAAA' },
            { identifier: '[s', type: 'silent',                    description: 'Silent',                                 default_css_class: 'slnt',              html_color: '#AAAAAA' },
            { identifier: '[l', type: 'lpieces-of-letters',        description: 'Lam Shamsiyyah',                         default_css_class: 'slnt',              html_color: '#AAAAAA' },
            { identifier: '[n', type: 'normal-prolongation',       description: 'Normal Prolongation: 2 Vowels',          default_css_class: 'madda_normal',      html_color: '#537FFF' },
            { identifier: '[p', type: 'permissible-prolongation',  description: 'Permissible Prolongation: 2, 4, 6 Vowels', default_css_class: 'madda_permissible', html_color: '#4050FF' },
            { identifier: '[m', type: 'necessary-prolongation',    description: 'Necessary Prolongation: 6 Vowels',       default_css_class: 'madda_necessary',   html_color: '#000EBC' },
            { identifier: '[q', type: 'qalqalah',                 description: 'Qalqalah',                               default_css_class: 'qlq',               html_color: '#DD0008' },
            { identifier: '[o', type: 'obligatory-prolongation',   description: 'Obligatory Prolongation: 4-5 Vowels',    default_css_class: 'madda_obligatory',  html_color: '#000EBC' },
            { identifier: '[c', type: 'ikhfa-shafawi',            description: 'Ikhfa\' Shafawi - Loss of Labial',        default_css_class: 'ikhf_shfw',         html_color: '#D500B7' },
            { identifier: '[f', type: 'ikhfa',                    description: 'Ikhfa\'',                                 default_css_class: 'ikhf',              html_color: '#9400A8' },
            { identifier: '[w', type: 'idgham-shafawi',           description: 'Idgham Shafawi - Loss of Labial',         default_css_class: 'idghm_shfw',        html_color: '#A1A1A1' },
            { identifier: '[i', type: 'iqlab',                    description: 'Iqlab',                                   default_css_class: 'iqlb',              html_color: '#26BFFD' },
            { identifier: '[a', type: 'idgham-ghunnah',           description: 'Idgham - Loss with Ghunnah',              default_css_class: 'idgh_ghn',          html_color: '#169200' },
            { identifier: '[u', type: 'idgham-without-ghunnah',   description: 'Idgham - Loss without Ghunnah',           default_css_class: 'idgh_w_ghn',        html_color: '#169200' },
            { identifier: '[d', type: 'idgham-mutajanisayn',      description: 'Idgham - Mutajanisayn',                   default_css_class: 'idgh_mus',          html_color: '#169200' },
            { identifier: '[b', type: 'idgham-mutaqaribayn',      description: 'Idgham - Mutaqaribayn',                   default_css_class: 'idgh_mus',          html_color: '#169200' },
            { identifier: '[g', type: 'ghunnah',                  description: 'Ghunnah: 2 Vowels',                       default_css_class: 'ghn',               html_color: '#FF7E1E' }
        ];
    }

    parse(text) {
        return this.closeParsing(this.parseTajweed(text));
    }

    parseTajweed(text) {
        this.meta.forEach(meta => {
            const re = new RegExp(`(\\${meta.identifier})`, 'ig');
            text = text.replace(
                re,
                `<tajweed class="${meta.default_css_class}" data-type="${meta.type}" data-description="${meta.description}" data-tajweed="`
            );
        });
        return text;
    }

    closeParsing(text) {
        // The format is: [x ... [ content ] where the second [ opens the content and ] closes it
        text = text.replace(/\[/g, '">');
        text = text.replace(/\]/g, '</tajweed>');
        return text;
    }

    getMeta() {
        return this.meta;
    }
}
