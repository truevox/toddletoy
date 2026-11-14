import {
  flagEmoji, flagForId, alpha2ForId, friendlyName, ISO_NUMERIC_TO_ALPHA2,
} from '../src/toys/globe-names.js';

describe('globe-names', () => {
  test('flagEmoji builds regional indicator pairs', () => {
    expect(flagEmoji('FR')).toBe('\u{1F1EB}\u{1F1F7}');
    expect(flagEmoji('us')).toBe('\u{1F1FA}\u{1F1F8}');
  });

  test('flagEmoji falls back to a neutral flag for bad input', () => {
    expect(flagEmoji(null)).toBe('🏳️');
    expect(flagEmoji('')).toBe('🏳️');
    expect(flagEmoji('USA')).toBe('🏳️');
    expect(flagEmoji('1A')).toBe('🏳️');
  });

  test('numeric ISO ids map to alpha-2 (string ids with leading zeros too)', () => {
    expect(alpha2ForId('076')).toBe('BR');
    expect(alpha2ForId(250)).toBe('FR');
    expect(alpha2ForId('840')).toBe('US');
    expect(alpha2ForId('392')).toBe('JP');
    expect(alpha2ForId('036')).toBe('AU');
    expect(alpha2ForId('818')).toBe('EG');
    expect(alpha2ForId('643')).toBe('RU');
    expect(alpha2ForId(undefined)).toBeNull();
    expect(alpha2ForId(null)).toBeNull();
    expect(alpha2ForId('999')).toBeNull();
  });

  test('features without an ISO code get the neutral flag', () => {
    expect(flagForId(undefined)).toBe('🏳️');
    expect(flagForId('076')).toBe('\u{1F1E7}\u{1F1F7}');
  });

  test('numeric table has unique alpha-2 codes', () => {
    const codes = Object.values(ISO_NUMERIC_TO_ALPHA2);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(170);
  });

  test('friendlyName expands Natural Earth abbreviations', () => {
    expect(friendlyName('United States of America')).toBe('United States');
    expect(friendlyName('Dem. Rep. Congo')).toBe('Democratic Republic of the Congo');
    expect(friendlyName('Central African Rep.')).toBe('Central African Republic');
    expect(friendlyName('Dominican Rep.')).toBe('Dominican Republic');
    expect(friendlyName('Bosnia and Herz.')).toBe('Bosnia and Herzegovina');
    expect(friendlyName('Eq. Guinea')).toBe('Equatorial Guinea');
    expect(friendlyName('S. Sudan')).toBe('South Sudan');
    expect(friendlyName('W. Sahara')).toBe('Western Sahara');
    expect(friendlyName('Fr. S. Antarctic Lands')).toBe('French Southern Lands');
    expect(friendlyName('Falkland Is.')).toBe('Falkland Islands');
    expect(friendlyName('Solomon Is.')).toBe('Solomon Islands');
    expect(friendlyName('N. Cyprus')).toBe('Northern Cyprus');
  });

  test('friendlyName leaves normal names alone and handles empties', () => {
    expect(friendlyName('Czechia')).toBe('Czechia');
    expect(friendlyName('Brazil')).toBe('Brazil');
    expect(friendlyName('Some Rep.')).toBe('Some Republic');
    expect(friendlyName(undefined)).toBe('Unknown');
  });
});
