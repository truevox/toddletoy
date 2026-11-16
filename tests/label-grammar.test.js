// Word order and agreement per language: a small grammar table decides how
// "colour + noun" is written (Red Circle / Círculo rojo / Étoile rouge / 红色圆形).
import fs from 'fs';
import path from 'path';
import { buildColorizedLabel } from '../src/game/utils/localization.js';
import { composeLabel, detectKind, getLabelWords, orderFor } from '../src/game/speech/labelGrammar.js';

const things = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/things.json'), 'utf8'));
const emojis = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/emojis.json'), 'utf8'));
const color = (name) => things.colors.find(c => c.value === name);
const shape = (name, colorName) => ({ ...things.shapes.find(s => s.value === name), color: color(colorName) });
const letter = (v, colorName) => ({ ...things.letters.find(l => l.value === v), color: color(colorName) });
const number = (v, colorName) => ({ ...things.numbers.find(n => n.value === v), color: color(colorName) });

describe('detectKind', () => {
    test('tells shapes, letters, numbers and emoji apart', () => {
        expect(detectKind(shape('Star', 'Red'))).toBe('shape');
        expect(detectKind(letter('A', 'Red'))).toBe('letter');
        expect(detectKind(number(5, 'Red'))).toBe('number');
        expect(detectKind(emojis[0])).toBe('emoji');
    });
});

describe('English: adjective first', () => {
    test.each([
        [shape('Circle', 'Red'), 'Red Circle'],
        [shape('Star', 'Blue'), 'Blue Star'],
        [shape('Heart', 'Yellow'), 'Yellow Heart'],
        [letter('A', 'Blue'), 'Blue A'],
        [number(5, 'Green'), 'Green Five']
    ])('%#', (data, expected) => {
        expect(buildColorizedLabel(data, 'en')).toBe(expected);
    });
});

describe('Spanish: noun first with agreement', () => {
    const shapes = {
        Circle: 'm', Square: 'm', Triangle: 'm', Star: 'f', Heart: 'm', Diamond: 'm'
    };
    const nouns = { Circle: 'Círculo', Square: 'Cuadrado', Triangle: 'Triángulo', Star: 'Estrella', Heart: 'Corazón', Diamond: 'Diamante' };
    const colours = {
        Red: ['rojo', 'roja'], Blue: ['azul', 'azul'], Yellow: ['amarillo', 'amarilla'],
        Green: ['verde', 'verde'], Orange: ['naranja', 'naranja'], Purple: ['morado', 'morada'],
        Black: ['negro', 'negra'], White: ['blanco', 'blanca'], Brown: ['marrón', 'marrón'],
        Gray: ['gris', 'gris'], Pink: ['rosa', 'rosa']
    };
    const cases = [];
    Object.keys(shapes).forEach(s => Object.keys(colours).forEach(c => {
        const [m, f] = colours[c];
        cases.push([s, c, `${nouns[s]} ${shapes[s] === 'f' ? f : m}`]);
    }));
    test.each(cases)('%s %s -> %s', (s, c, expected) => {
        expect(buildColorizedLabel(shape(s, c), 'es')).toBe(expected);
    });

    test('named examples from the brief', () => {
        expect(buildColorizedLabel(shape('Circle', 'Red'), 'es')).toBe('Círculo rojo');
        expect(buildColorizedLabel(shape('Star', 'Red'), 'es')).toBe('Estrella roja');
        expect(buildColorizedLabel(shape('Heart', 'Yellow'), 'es')).toBe('Corazón amarillo');
    });

    test('letters are feminine, numbers masculine, invariant colours unchanged', () => {
        expect(buildColorizedLabel(letter('A', 'Red'), 'es')).toBe('A roja');
        expect(buildColorizedLabel(letter('B', 'White'), 'es')).toBe('B blanca');
        expect(buildColorizedLabel(letter('C', 'Blue'), 'es')).toBe('C azul');
        expect(buildColorizedLabel(number(5, 'Green'), 'es')).toBe('Cinco verde');
        expect(buildColorizedLabel(number(3, 'Red'), 'es')).toBe('Tres rojo');
        expect(buildColorizedLabel(number(0, 'Black'), 'es')).toBe('Cero negro');
    });
});

describe('French and Portuguese: noun first with agreement', () => {
    test.each([
        ['fr', shape('Star', 'Red'), 'Étoile rouge'],
        ['fr', shape('Star', 'Blue'), 'Étoile bleue'],
        ['fr', shape('Star', 'White'), 'Étoile blanche'],
        ['fr', shape('Circle', 'Blue'), 'Cercle bleu'],
        ['fr', shape('Heart', 'Green'), 'Cœur vert'],
        ['fr', shape('Square', 'Pink'), 'Carré rose'],
        ['fr', shape('Star', 'Purple'), 'Étoile violette'],
        ['fr', number(5, 'Black'), 'Cinq noir'],
        ['pt', shape('Star', 'Red'), 'Estrela vermelha'],
        ['pt', shape('Circle', 'Red'), 'Círculo vermelho'],
        ['pt', shape('Heart', 'Blue'), 'Coração azul'],
        ['pt', shape('Star', 'Gray'), 'Estrela cinza'],
        ['pt', shape('Star', 'Yellow'), 'Estrela amarela'],
        ['pt', number(5, 'Green'), 'Cinco verde']
    ])('%s %#', (lang, data, expected) => {
        expect(buildColorizedLabel(data, lang)).toBe(expected);
    });
});

describe('Other languages: order only, data forms untouched', () => {
    test.each([
        ['zh', shape('Circle', 'Red'), '红色圆形'],
        ['hi', shape('Circle', 'Red'), 'लाल वृत्त'],
        ['bn', shape('Circle', 'Red'), 'লাল বৃত্ত'],
        ['ru', shape('Circle', 'Red'), 'Красный Круг'],
        ['eo', shape('Circle', 'Red'), 'Ruĝa Cirklo'],
        ['jbo', shape('Circle', 'Red'), 'xunre cukla'],
        ['ar', shape('Circle', 'Red'), 'دائرة أحمر'],
        ['id', shape('Circle', 'Red'), 'Lingkaran Merah'],
        ['tlh', shape('Circle', 'Red'), 'nugh Doq']
    ])('%s', (lang, data, expected) => {
        expect(buildColorizedLabel(data, lang)).toBe(expected);
    });

    test('Chinese keeps a Latin letter as its own word', () => {
        expect(buildColorizedLabel(letter('A', 'Red'), 'zh')).toBe('红色 A');
    });
});

describe('Emoji and edge cases', () => {
    test('emoji labels are unchanged', () => {
        expect(buildColorizedLabel(emojis[0], 'en')).toBe('Dog');
        expect(buildColorizedLabel(emojis[0], 'es')).toBe('Perro');
    });
    test('missing colour translation falls back to the English colour', () => {
        const data = { value: 'Square', color: { 'en-US': 'Green', value: 'Green' } };
        expect(buildColorizedLabel(data, 'ru')).toBe('Green Square');
    });
    test('no colour: just the noun', () => {
        expect(buildColorizedLabel({ value: 'Circle', es: 'Círculo' }, 'es')).toBe('Círculo');
    });
    test('unknown language code uses English order; regional codes use the base language', () => {
        expect(orderFor('xx')).toBe('adj-noun');
        expect(orderFor('es-MX')).toBe('noun-adj');
    });
    test('composeLabel and getLabelWords agree with the caption splitter', () => {
        const text = composeLabel({ kind: 'shape', nounKey: 'Star', noun: 'Estrella', colorKey: 'Red', colorWord: 'Rojo' }, 'es');
        expect(text).toBe('Estrella roja');
        expect(getLabelWords(text)).toEqual(['Estrella', 'roja']);
    });
});
