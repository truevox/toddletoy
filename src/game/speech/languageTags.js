/** Web Speech language tags per toy language code (fun languages borrow English). */
export const LANGUAGE_TAGS = {
    en: 'en-US', es: 'es-ES', zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA', fr: 'fr-FR',
    bn: 'bn-BD', pt: 'pt-PT', ru: 'ru-RU', id: 'id-ID',
    tlh: 'en-US', jbo: 'en-US', eo: 'eo'
};

export function tagFor(code) {
    return LANGUAGE_TAGS[code] || 'en-US';
}
