/** CaptionFade - set one alpha on an object's caption words and number rows (not the glyph). */
export function setCaptionAlpha(obj, a) {
    const groups = obj.allLanguageWords;
    if (groups) {
        for (let i = 0; i < groups.length; i++) {
            const words = groups[i].words;
            if (words) for (let j = 0; j < words.length; j++) setA(words[j], a);
        }
    }
    const rows = obj.componentLayout && obj.componentLayout.numberModes;
    if (rows) for (let i = 0; i < rows.length; i++) if (rows[i]) setA(rows[i].object, a);
}

function setA(go, a) {
    if (go && go.alpha !== a) go.alpha = a;
}

/** Every display object of an object (glyph first), for hand-over to a ghost. */
export function collectDisplayObjects(obj) {
    const items = [obj];
    const groups = obj.allLanguageWords;
    if (groups) groups.forEach(g => (g.words || []).forEach(w => w && items.push(w)));
    const rows = obj.componentLayout && obj.componentLayout.numberModes;
    if (rows) rows.forEach(r => r && r.object && items.push(r.object));
    return items;
}
