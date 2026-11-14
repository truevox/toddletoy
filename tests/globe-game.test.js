
describe('Find-it starter targets', () => {
  test('the first target is always a large, famous country', () => {
    const { FindGame } = require('../src/toys/globe-game.js');
    const mk = (alpha2, cap, idx) => ({ alpha2, capRadiusDeg: cap, idx, name: alpha2 });
    const countries = [mk('KZ', 16, 0), mk('MN', 15, 1), mk('US', 20, 2), mk('BR', 18, 3), mk('AU', 17, 4), mk('SA', 15, 5), mk('CN', 19, 6)];
    for (let seed = 0; seed < 20; seed++) {
      const game = new FindGame(countries, { rng: () => (seed % 10) / 10 });
      game.start(0, 300);
      const t = game.target;
      expect(['US', 'BR', 'AU', 'CN']).toContain(t.alpha2);
    }
  });
});
