/**
 * GlobeToy - Spinnable flat world map for toddlers
 * Swipe to spin; tap a country to hear its name and see its flag.
 */

// ── Country data ──────────────────────────────────────────────────────────────
// Each polygon is an array of [longitude, latitude] pairs.
const COUNTRIES = [
  // North America
  { id:1,  code:'US', name:'United States',  color:'#42A5F5', polys:[
    [[-124,49],[-95,49],[-83,46],[-79,43],[-67,47],[-67,44],[-70,42],[-74,40],[-76,35],[-81,31],[-89,30],[-94,29],[-97,26],[-104,29],[-110,31],[-117,33],[-122,37],[-124,37],[-124,49]],
    [[-141,60],[-141,71],[-156,71],[-167,68],[-163,60],[-155,58],[-141,60]],
  ]},
  { id:2,  code:'CA', name:'Canada',         color:'#EF5350', polys:[
    [[-141,60],[-141,83],[-55,83],[-52,47],[-67,47],[-79,43],[-83,46],[-89,48],[-95,49],[-141,60]],
  ]},
  { id:3,  code:'MX', name:'Mexico',         color:'#66BB6A', polys:[
    [[-117,33],[-97,26],[-97,22],[-92,18],[-87,16],[-83,18],[-85,23],[-87,21],[-90,19],[-97,22],[-104,29],[-110,31],[-117,33]],
  ]},
  { id:4,  code:'GL', name:'Greenland',      color:'#B3E5FC', polys:[
    [[-73,83],[-12,83],[-12,76],[-24,68],[-46,66],[-52,69],[-58,77],[-73,83]],
  ]},
  { id:5,  code:'CU', name:'Cuba',           color:'#E8EAF6', polys:[
    [[-85,23],[-83,23],[-75,20],[-74,20],[-83,22],[-85,23]],
  ]},
  { id:6,  code:'GT', name:'Guatemala',      color:'#F3E5F5', polys:[
    [[-92,18],[-87,16],[-89,16],[-89,18],[-92,18]],
  ]},
  // South America
  { id:7,  code:'CO', name:'Colombia',       color:'#FF7043', polys:[
    [[-77,8],[-67,12],[-63,10],[-61,5],[-68,1],[-73,-4],[-77,0],[-79,1],[-78,8],[-77,8]],
  ]},
  { id:8,  code:'VE', name:'Venezuela',      color:'#FFF176', polys:[
    [[-73,12],[-60,13],[-63,10],[-67,12],[-73,8],[-73,12]],
  ]},
  { id:9,  code:'BR', name:'Brazil',         color:'#4CAF50', polys:[
    [[-35,-8],[-34,-4],[-44,2],[-50,4],[-60,5],[-68,1],[-73,-4],[-75,-14],[-74,-18],[-66,-18],[-53,-34],[-41,-22],[-39,-16],[-35,-8]],
  ]},
  { id:10, code:'PE', name:'Peru',           color:'#EC407A', polys:[
    [[-75,-14],[-68,1],[-73,-4],[-75,-14],[-80,-4],[-81,-8],[-80,-18],[-75,-14]],
  ]},
  { id:11, code:'BO', name:'Bolivia',        color:'#AB47BC', polys:[
    [[-69,-18],[-66,-18],[-60,-22],[-58,-20],[-63,-15],[-69,-15],[-69,-18]],
  ]},
  { id:12, code:'CL', name:'Chile',          color:'#EF5350', polys:[
    [[-70,-18],[-67,-22],[-70,-30],[-71,-33],[-72,-39],[-73,-45],[-75,-52],[-69,-52],[-66,-56],[-65,-55],[-63,-52],[-62,-39],[-70,-30],[-70,-18]],
  ]},
  { id:13, code:'AR', name:'Argentina',      color:'#29B6F6', polys:[
    [[-66,-18],[-53,-34],[-57,-38],[-62,-39],[-63,-52],[-65,-55],[-69,-52],[-75,-52],[-74,-18],[-66,-18]],
  ]},
  { id:14, code:'PY', name:'Paraguay',       color:'#FFECB3', polys:[
    [[-62,-22],[-58,-20],[-60,-22],[-66,-22],[-62,-22]],
  ]},
  // Europe
  { id:15, code:'IS', name:'Iceland',        color:'#ECEFF1', polys:[
    [[-25,64],[-13,66],[-13,65],[-17,63],[-25,64]],
  ]},
  { id:16, code:'GB', name:'United Kingdom', color:'#5C6BC0', polys:[
    [[-6,50],[-1,51],[2,51],[1,52],[-1,53],[-3,55],[-5,56],[-7,58],[-1,61],[2,51],[-1,51],[-6,50]],
  ]},
  { id:17, code:'IE', name:'Ireland',        color:'#A5D6A7', polys:[
    [[-10,52],[-6,54],[-6,55],[-8,56],[-10,52]],
  ]},
  { id:18, code:'NO', name:'Norway',         color:'#FFCDD2', polys:[
    [[5,58],[14,58],[18,64],[28,71],[30,70],[26,64],[18,64],[14,58],[5,58]],
  ]},
  { id:19, code:'SE', name:'Sweden',         color:'#FFF9C4', polys:[
    [[11,56],[14,58],[18,64],[24,66],[24,60],[18,57],[11,56]],
  ]},
  { id:20, code:'FI', name:'Finland',        color:'#B2EBF2', polys:[
    [[24,60],[28,65],[29,71],[27,70],[24,68],[26,65],[25,60],[24,60]],
  ]},
  { id:21, code:'FR', name:'France',         color:'#80DEEA', polys:[
    [[-5,46],[8,49],[7,47],[6,44],[3,43],[-2,43],[-5,46]],
  ]},
  { id:22, code:'ES', name:'Spain',          color:'#FFCC80', polys:[
    [[-9,44],[3,44],[3,40],[-1,37],[-6,36],[-9,37],[-9,44]],
  ]},
  { id:23, code:'PT', name:'Portugal',       color:'#CE93D8', polys:[
    [[-9,42],[-6,42],[-7,37],[-9,37],[-9,42]],
  ]},
  { id:24, code:'DE', name:'Germany',        color:'#C5CAE9', polys:[
    [[6,51],[15,54],[15,51],[14,49],[11,47],[6,47],[6,51]],
  ]},
  { id:25, code:'PL', name:'Poland',         color:'#F8BBD0', polys:[
    [[14,54],[24,54],[24,49],[14,49],[14,54]],
  ]},
  { id:26, code:'IT', name:'Italy',          color:'#C8E6C9', polys:[
    [[7,44],[16,41],[15,38],[16,38],[13,37],[11,38],[9,44],[7,44]],
  ]},
  { id:27, code:'UA', name:'Ukraine',        color:'#FFF9C4', polys:[
    [[22,52],[40,50],[40,45],[34,46],[30,46],[22,48],[22,52]],
  ]},
  { id:28, code:'RO', name:'Romania',        color:'#E3F2FD', polys:[
    [[22,48],[30,48],[30,44],[22,44],[22,48]],
  ]},
  { id:29, code:'TR', name:'Turkey',         color:'#FFE0B2', polys:[
    [[26,42],[44,42],[44,37],[36,36],[28,37],[26,38],[26,42]],
  ]},
  { id:30, code:'GR', name:'Greece',         color:'#DCEDC8', polys:[
    [[20,42],[26,42],[26,37],[20,36],[20,42]],
  ]},
  { id:31, code:'RU', name:'Russia',         color:'#90A4AE', polys:[
    [[28,72],[60,75],[68,73],[90,76],[100,73],[105,77],[140,73],[141,47],[133,43],[120,43],[100,47],[87,50],[60,55],[55,52],[40,50],[34,47],[28,48],[28,72]],
  ]},
  { id:32, code:'BY', name:'Belarus',        color:'#FCE4EC', polys:[
    [[24,52],[32,52],[32,51],[24,51],[24,52]],
  ]},
  { id:33, code:'CZ', name:'Czech Republic', color:'#E8F5E9', polys:[
    [[12,51],[18,51],[18,49],[12,49],[12,51]],
  ]},
  { id:34, code:'AT', name:'Austria',        color:'#FFF3E0', polys:[
    [[9,48],[17,48],[17,47],[9,47],[9,48]],
  ]},
  { id:35, code:'CH', name:'Switzerland',    color:'#E1F5FE', polys:[
    [[6,47],[10,47],[10,46],[6,46],[6,47]],
  ]},
  // Africa
  { id:36, code:'MA', name:'Morocco',        color:'#FFCC80', polys:[
    [[-6,36],[-1,36],[-1,30],[-6,25],[-14,25],[-14,36],[-6,36]],
  ]},
  { id:37, code:'DZ', name:'Algeria',        color:'#A5D6A7', polys:[
    [[-2,37],[9,37],[11,30],[11,24],[3,20],[-5,20],[-9,27],[-2,37]],
  ]},
  { id:38, code:'LY', name:'Libya',          color:'#FFF9C4', polys:[
    [[11,33],[25,31],[25,24],[11,24],[11,33]],
  ]},
  { id:39, code:'EG', name:'Egypt',          color:'#F5E6C8', polys:[
    [[25,31],[36,31],[37,22],[36,22],[25,22],[25,31]],
  ]},
  { id:40, code:'SD', name:'Sudan',          color:'#FFECB3', polys:[
    [[25,22],[37,22],[38,15],[36,15],[33,11],[27,11],[25,15],[25,22]],
  ]},
  { id:41, code:'NG', name:'Nigeria',        color:'#B2DFDB', polys:[
    [[3,6],[15,14],[15,12],[10,8],[4,8],[3,6]],
  ]},
  { id:42, code:'ET', name:'Ethiopia',       color:'#FFCDD2', polys:[
    [[33,15],[42,15],[48,12],[43,11],[41,4],[40,4],[35,5],[33,15]],
  ]},
  { id:43, code:'SO', name:'Somalia',        color:'#E8EAF6', polys:[
    [[42,12],[49,12],[51,8],[41,0],[41,4],[43,11],[42,12]],
  ]},
  { id:44, code:'KE', name:'Kenya',          color:'#FFF3E0', polys:[
    [[34,5],[42,4],[42,-2],[40,-1],[34,0],[34,5]],
  ]},
  { id:45, code:'TZ', name:'Tanzania',       color:'#BBDEFB', polys:[
    [[30,-1],[40,-1],[40,-11],[35,-11],[30,-5],[30,-1]],
  ]},
  { id:46, code:'CD', name:'DR Congo',       color:'#DCEDC8', polys:[
    [[12,-5],[18,5],[27,5],[31,0],[31,-5],[27,-12],[18,-12],[12,-5]],
  ]},
  { id:47, code:'AO', name:'Angola',         color:'#F8BBD0', polys:[
    [[12,-5],[18,-5],[25,-10],[24,-18],[18,-18],[12,-17],[12,-5]],
  ]},
  { id:48, code:'ZA', name:'South Africa',   color:'#C8E6C9', polys:[
    [[17,-28],[20,-17],[26,-18],[33,-27],[30,-32],[27,-34],[18,-35],[17,-28]],
  ]},
  { id:49, code:'MG', name:'Madagascar',     color:'#FCE4EC', polys:[
    [[44,-12],[50,-12],[50,-25],[44,-25],[44,-12]],
  ]},
  { id:50, code:'GH', name:'Ghana',          color:'#E8F5E9', polys:[
    [[-3,11],[1,11],[1,5],[-3,5],[-3,11]],
  ]},
  { id:51, code:'CM', name:'Cameroon',       color:'#FFF3E0', polys:[
    [[9,13],[15,13],[15,4],[10,4],[8,6],[9,13]],
  ]},
  { id:52, code:'MZ', name:'Mozambique',     color:'#E3F2FD', polys:[
    [[35,-10],[36,-11],[40,-15],[40,-26],[33,-27],[30,-20],[33,-15],[35,-10]],
  ]},
  { id:53, code:'ZM', name:'Zambia',         color:'#E8F5E9', polys:[
    [[22,-8],[33,-8],[33,-18],[27,-18],[22,-15],[22,-8]],
  ]},
  { id:54, code:'ZW', name:'Zimbabwe',       color:'#FFFDE7', polys:[
    [[26,-18],[33,-18],[33,-22],[26,-22],[26,-18]],
  ]},
  // Middle East
  { id:55, code:'SA', name:'Saudi Arabia',   color:'#D7CBA5', polys:[
    [[37,29],[46,29],[56,24],[55,22],[44,13],[42,17],[37,22],[37,29]],
  ]},
  { id:56, code:'IR', name:'Iran',           color:'#C8E6C9', polys:[
    [[44,39],[48,39],[56,37],[63,37],[61,25],[56,24],[54,26],[44,29],[44,39]],
  ]},
  { id:57, code:'IQ', name:'Iraq',           color:'#F0F4C3', polys:[
    [[38,37],[46,37],[48,35],[49,31],[46,30],[44,33],[38,33],[38,37]],
  ]},
  { id:58, code:'SY', name:'Syria',          color:'#F3E5F5', polys:[
    [[36,37],[42,37],[42,33],[36,33],[36,37]],
  ]},
  { id:59, code:'YE', name:'Yemen',          color:'#FFF8E1', polys:[
    [[44,18],[55,22],[54,17],[48,12],[43,13],[44,18]],
  ]},
  // Asia
  { id:60, code:'KZ', name:'Kazakhstan',     color:'#E0F7FA', polys:[
    [[50,52],[60,55],[60,54],[87,50],[87,42],[61,41],[50,44],[50,52]],
  ]},
  { id:61, code:'AF', name:'Afghanistan',    color:'#E8F5E9', polys:[
    [[61,38],[74,37],[75,35],[72,29],[66,29],[61,29],[61,38]],
  ]},
  { id:62, code:'PK', name:'Pakistan',       color:'#B2DFDB', polys:[
    [[61,36],[74,37],[76,35],[72,29],[66,25],[61,25],[61,36]],
  ]},
  { id:63, code:'IN', name:'India',          color:'#FFE082', polys:[
    [[68,37],[80,35],[97,28],[97,24],[93,21],[88,21],[80,14],[77,8],[76,9],[73,16],[69,23],[68,37]],
  ]},
  { id:64, code:'CN', name:'China',          color:'#FFCDD2', polys:[
    [[73,39],[73,53],[90,49],[117,53],[135,48],[135,43],[120,40],[120,32],[111,22],[100,22],[91,27],[80,35],[73,39]],
  ]},
  { id:65, code:'MN', name:'Mongolia',       color:'#FFE0B2', polys:[
    [[87,50],[117,50],[120,48],[120,40],[110,38],[100,42],[87,50]],
  ]},
  { id:66, code:'JP', name:'Japan',          color:'#FADADD', polys:[
    [[130,33],[135,34],[137,35],[140,36],[141,40],[141,42],[139,44],[135,43],[131,34],[130,33]],
    [[130,31],[131,33],[132,33],[131,32],[130,31]],
    [[141,42],[145,44],[145,43],[141,41],[141,42]],
  ]},
  { id:67, code:'KR', name:'South Korea',    color:'#B3E5FC', polys:[
    [[125,38],[129,38],[130,35],[126,34],[125,35],[125,38]],
  ]},
  { id:68, code:'TH', name:'Thailand',       color:'#E1BEE7', polys:[
    [[97,20],[104,22],[104,17],[102,12],[99,10],[98,16],[97,20]],
  ]},
  { id:69, code:'VN', name:'Vietnam',        color:'#C8E6C9', polys:[
    [[102,23],[108,21],[108,16],[108,11],[104,11],[102,12],[104,17],[102,23]],
  ]},
  { id:70, code:'MM', name:'Myanmar',        color:'#DCEDC8', polys:[
    [[92,28],[100,26],[101,22],[99,19],[98,17],[97,16],[95,22],[92,28]],
  ]},
  { id:71, code:'ID', name:'Indonesia',      color:'#FFCCBC', polys:[
    [[95,6],[105,-5],[106,-5],[105,-7],[104,-8],[98,-5],[95,6]],
    [[105,-7],[114,-7],[114,-8],[111,-9],[107,-8],[105,-7]],
    [[108,7],[117,7],[117,-4],[115,-4],[109,-2],[108,7]],
  ]},
  { id:72, code:'PH', name:'Philippines',    color:'#E8EAF6', polys:[
    [[118,18],[122,18],[122,14],[120,12],[118,14],[118,18]],
    [[123,8],[126,8],[126,6],[124,6],[123,8]],
  ]},
  { id:73, code:'MY', name:'Malaysia',       color:'#FFF9C4', polys:[
    [[100,6],[104,6],[105,1],[103,1],[100,3],[100,6]],
  ]},
  // Oceania
  { id:74, code:'AU', name:'Australia',      color:'#FFA726', polys:[
    [[113,-22],[120,-14],[127,-14],[136,-12],[138,-17],[147,-20],[153,-28],[151,-34],[149,-38],[140,-39],[131,-32],[126,-34],[114,-34],[113,-22]],
  ]},
  { id:75, code:'NZ', name:'New Zealand',    color:'#80CBC4', polys:[
    [[172,-34],[178,-38],[175,-41],[174,-37],[172,-34]],
    [[166,-45],[173,-45],[172,-46],[170,-43],[166,-45]],
  ]},
  { id:76, code:'PG', name:'Papua New Guinea', color:'#B3E5FC', polys:[
    [[141,-5],[150,-5],[152,-8],[147,-10],[141,-8],[141,-5]],
  ]},
];

// Build id → country lookup
const COUNTRY_BY_ID = {};
COUNTRIES.forEach(c => { COUNTRY_BY_ID[c.id] = c; });

// ── GlobeToy class ────────────────────────────────────────────────────────────
export class GlobeToy {
  constructor(router, configManager = null) {
    this.router        = router;
    this.configManager = configManager;
    this.container = null;
    this.canvas    = null;
    this.ctx       = null;
    this.hitCanvas = null;
    this.hitCtx    = null;

    this.lonOff    = -10;   // start with Atlantic roughly centred
    this.velDeg    = 0;     // momentum in degrees per frame
    this.rafId     = null;

    this._ptrs       = {};  // active pointers
    this._lastPtrX   = null;
    this._lastPtrT   = null;
    this._dragging   = false;

    this._resizeH    = null;
    this._infoTimer  = null;
    this.selectedId  = null;

    // Projection cache: keyed by poly array reference, stores typed arrays for xs/ys
    this._polyCache  = new WeakMap();
    this._cacheH     = 0;   // canvas height when ys were last computed
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  show() {
    if (!this.container) {
      this.container = this._build();
      document.body.appendChild(this.container);
    }
    this.container.style.display = 'block';
    this._render();
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
    this._stopLoop();
  }

  destroy() {
    this._stopLoop();
    if (this._resizeH) window.removeEventListener('resize', this._resizeH);
    if (this.container && this.container.parentNode)
      this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  // ── DOM construction ───────────────────────────────────────────────────────
  _build() {
    const wrap = document.createElement('div');
    wrap.id = 'globe-toy';
    wrap.style.cssText = 'position:fixed;inset:0;background:#0a1628;z-index:500;overflow:hidden;font-family:Arial,sans-serif;';

    // Main canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none;';
    wrap.appendChild(this.canvas);

    // Offscreen hit canvas (never attached to DOM)
    this.hitCanvas = document.createElement('canvas');
    this.hitCtx    = this.hitCanvas.getContext('2d', { willReadFrequently: true });

    this._syncSize();
    this.ctx = this.canvas.getContext('2d');

    // Info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      position:absolute;bottom:64px;left:50%;transform:translateX(-50%);
      background:rgba(0,10,30,0.88);border:1px solid rgba(255,255,255,0.22);
      border-radius:18px;padding:12px 28px;color:#fff;
      font-size:clamp(1.1rem,5vw,1.7rem);text-align:center;
      pointer-events:none;opacity:0;transition:opacity 0.3s;
      white-space:nowrap;max-width:90vw;
    `;
    wrap.appendChild(this.infoPanel);

    // Back button
    const back = document.createElement('button');
    back.textContent = '← Back';
    back.style.cssText = `
      position:absolute;top:16px;left:16px;
      background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);
      color:#fff;padding:9px 20px;border-radius:30px;
      cursor:pointer;font-size:0.95rem;z-index:10;font-family:Arial,sans-serif;
    `;
    back.addEventListener('click', () => this.router.navigate('/'));
    wrap.appendChild(back);

    // Title
    const title = document.createElement('div');
    title.textContent = '🌍 World Globe';
    title.style.cssText = `
      position:absolute;top:18px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.75);font-size:1.1rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(title);

    // Hint
    const hint = document.createElement('div');
    hint.textContent = 'Swipe to spin  •  Tap a country!';
    hint.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.3);font-size:0.8rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(hint);

    // Pointer events
    this.canvas.addEventListener('pointerdown',  e => this._onDown(e));
    this.canvas.addEventListener('pointermove',  e => this._onMove(e));
    this.canvas.addEventListener('pointerup',    e => this._onUp(e));
    this.canvas.addEventListener('pointercancel',e => this._onUp(e));

    // Resize
    this._resizeH = () => { this._syncSize(); this._render(); };
    window.addEventListener('resize', this._resizeH);

    return wrap;
  }

  _syncSize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (this.canvas)    { this.canvas.width = w;    this.canvas.height = h; }
    if (this.hitCanvas) { this.hitCanvas.width = w; this.hitCanvas.height = h; }
  }

  // ── Projection helpers ─────────────────────────────────────────────────────
  _px(lon, W) {
    return (((lon - this.lonOff + 180) % 360 + 360) % 360) / 360 * W;
  }
  _py(lat, H) {
    return (90 - lat) / 180 * H;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  _render() {
    const { canvas, ctx, hitCanvas, hitCtx } = this;
    const W = canvas.width, H = canvas.height;

    // Invalidate y-cache when canvas height changes
    if (H !== this._cacheH) {
      this._polyCache = new WeakMap();
      this._cacheH = H;
    }

    // Ocean background
    ctx.fillStyle = '#1a6fa8';
    ctx.fillRect(0, 0, W, H);
    hitCtx.fillStyle = '#000000';
    hitCtx.fillRect(0, 0, W, H);

    // Latitude grid lines (subtle)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = this._py(lat, H);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    const eq = this._py(0, H);
    ctx.beginPath(); ctx.moveTo(0, eq); ctx.lineTo(W, eq); ctx.stroke();
    ctx.restore();

    // Draw countries using cached projections
    COUNTRIES.forEach(country => {
      const isSelected = this.selectedId === country.id;
      const fill    = isSelected ? '#ffffff' : country.color;
      const hitFill = `rgb(${country.id},0,0)`;

      country.polys.forEach(poly => {
        const proj = this._project(poly, W, H);
        this._drawProjected(ctx,    proj, W, fill,    'rgba(0,0,0,0.35)', 0.6);
        this._drawProjected(hitCtx, proj, W, hitFill, null,               0);
      });
    });
  }

  // Returns (and caches) a {xs, ys, count} projection for a poly at current lonOff.
  // ys are stable across frames (only depend on H); xs recomputed each frame (depend on lonOff).
  _project(poly, W, H) {
    let entry = this._polyCache.get(poly);
    if (!entry) {
      const n = poly.length;
      entry = {
        lons: new Float32Array(n),
        ys:   new Float32Array(n),
        xs:   new Float32Array(n),
        count: n,
      };
      for (let i = 0; i < n; i++) {
        entry.lons[i] = poly[i][0];
        entry.ys[i]   = this._py(poly[i][1], H);
      }
      this._polyCache.set(poly, entry);
    }

    // Recompute xs (lonOff changes every frame during spin)
    const { lons, xs, ys, count } = entry;
    for (let i = 0; i < count; i++) xs[i] = this._px(lons[i], W);

    // Seam repair
    for (let i = 1; i < count; i++) {
      const dx = xs[i] - xs[i - 1];
      if (dx >  W / 2) xs[i] -= W;
      if (dx < -W / 2) xs[i] += W;
    }

    return { xs, ys, count };
  }

  _drawProjected(ctx, { xs, ys, count }, W, fillStyle, strokeStyle, lineWidth) {
    ctx.fillStyle = fillStyle;
    if (strokeStyle && lineWidth > 0) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth   = lineWidth;
    }

    for (const dx of [0, W, -W]) {
      ctx.beginPath();
      ctx.moveTo(xs[0] + dx, ys[0]);
      for (let i = 1; i < count; i++) ctx.lineTo(xs[i] + dx, ys[i]);
      ctx.closePath();
      ctx.fill();
      if (strokeStyle && lineWidth > 0) ctx.stroke();
    }
  }

  // ── Pointer handling ───────────────────────────────────────────────────────
  _onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this._ptrs[e.pointerId] = e.clientX;
    this._lastPtrX = e.clientX;
    this._lastPtrT = performance.now();
    this._dragging  = false;
    this.velDeg     = 0;
    this._stopLoop();
  }

  _onMove(e) {
    if (!(e.pointerId in this._ptrs)) return;
    const dx = e.clientX - this._lastPtrX;
    if (Math.abs(dx) > 2) this._dragging = true;
    const degPerPx = 360 / this.canvas.width;
    const dlon = -dx * degPerPx;

    // Estimate velocity (degrees/ms → converted to degrees/frame at ~60fps)
    const now = performance.now();
    const dt  = now - this._lastPtrT;
    if (dt > 0) this.velDeg = (dlon / dt) * (1000 / 60);

    this.lonOff     += dlon;
    this._lastPtrX   = e.clientX;
    this._lastPtrT   = now;
    this._ptrs[e.pointerId] = e.clientX;
    this._render();
  }

  _onUp(e) {
    if (!(e.pointerId in this._ptrs)) return;
    delete this._ptrs[e.pointerId];

    if (!this._dragging) {
      this._handleTap(e.clientX, e.clientY);
    } else if (Math.abs(this.velDeg) > 0.1) {
      this._startMomentum();
    }
    this._dragging = false;
  }

  _startMomentum() {
    const loop = () => {
      this.velDeg *= 0.93;
      this.lonOff += this.velDeg;
      this._render();
      if (Math.abs(this.velDeg) > 0.05) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  // ── Hit detection ──────────────────────────────────────────────────────────
  _handleTap(cx, cy) {
    const rect  = this.canvas.getBoundingClientRect();
    const cW    = this.hitCanvas.width;
    const cH    = this.hitCanvas.height;
    if (!rect.width || !rect.height || !cW || !cH) return;

    const sx    = cW / rect.width;
    const sy    = cH / rect.height;
    const x     = Math.max(0, Math.min(cW - 1, Math.round((cx - rect.left) * sx)));
    const y     = Math.max(0, Math.min(cH - 1, Math.round((cy - rect.top)  * sy)));

    const px    = this.hitCtx.getImageData(x, y, 1, 1).data;
    const id    = px[0];  // R channel = country id (0 = ocean)

    if (id > 0 && COUNTRY_BY_ID[id]) {
      const country = COUNTRY_BY_ID[id];
      this.selectedId = id;
      this._render();
      const flag = this._flag(country.code);
      this._showInfo(`${flag} ${country.name}`);
      this._speak(country.name);
    } else {
      this.selectedId = null;
      this._render();
    }
  }

  // ── Info panel ─────────────────────────────────────────────────────────────
  _showInfo(text) {
    clearTimeout(this._infoTimer);
    this.infoPanel.textContent = text;
    this.infoPanel.style.opacity = '1';
    this._infoTimer = setTimeout(() => {
      this.infoPanel.style.opacity = '0';
      this.selectedId = null;
      this._render();
    }, 5000);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  _flag(code) {
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
    );
  }

  _speak(text) {
    if (!window.speechSynthesis) return;
    const cfg = this.configManager?.getSpeechConfig?.() ?? {};
    if (cfg.mute) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate   = typeof cfg.rate   === 'number' ? cfg.rate   : 0.85;
    u.volume = typeof cfg.volume === 'number' ? cfg.volume / 100 : 1;
    u.pitch  = 1.1;
    window.speechSynthesis.speak(u);
  }
}
