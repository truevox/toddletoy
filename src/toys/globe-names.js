/**
 * Country naming + flags for the globe toy.
 * world-atlas (Natural Earth) features carry ISO 3166-1 numeric ids and
 * English names that are often abbreviated; this maps them to alpha-2 codes
 * (for flag emoji) and toddler-friendly spoken names.
 */

const ISO_PAIRS = `004AF 008AL 010AQ 012DZ 024AO 031AZ 032AR 036AU 040AT 044BS 050BD 051AM 056BE 064BT 068BO 070BA 072BW
076BR 084BZ 090SB 096BN 100BG 104MM 108BI 112BY 116KH 120CM 124CA 140CF 144LK 148TD 152CL 156CN 158TW 170CO 178CG 180CD
188CR 191HR 192CU 196CY 203CZ 204BJ 208DK 214DO 218EC 222SV 226GQ 231ET 232ER 233EE 238FK 242FJ 246FI 250FR 260TF 262DJ
266GA 268GE 270GM 275PS 276DE 288GH 300GR 304GL 320GT 324GN 328GY 332HT 340HN 348HU 352IS 356IN 360ID 364IR 368IQ 372IE
376IL 380IT 384CI 388JM 392JP 398KZ 400JO 404KE 408KP 410KR 414KW 417KG 418LA 422LB 426LS 428LV 430LR 434LY 440LT 442LU
450MG 454MW 458MY 466ML 478MR 484MX 496MN 498MD 499ME 504MA 508MZ 512OM 516NA 524NP 528NL 540NC 548VU 554NZ 558NI 562NE
566NG 578NO 586PK 591PA 598PG 600PY 604PE 608PH 616PL 620PT 624GW 626TL 630PR 634QA 642RO 643RU 646RW 682SA 686SN 688RS
694SL 703SK 704VN 705SI 706SO 710ZA 716ZW 724ES 728SS 729SD 732EH 740SR 748SZ 752SE 756CH 760SY 762TJ 764TH 768TG
780TT 784AE 788TN 792TR 795TM 800UG 804UA 807MK 818EG 826GB 834TZ 840US 854BF 858UY 860UZ 862VE 887YE 894ZM`
  .split(/\s+/).filter(p => /^\d{3}[A-Z]{2}$/.test(p));

/** ISO numeric id (number) -> alpha-2 */
export const ISO_NUMERIC_TO_ALPHA2 = Object.fromEntries(
  ISO_PAIRS.map(p => [parseInt(p.slice(0, 3), 10), p.slice(3)])
);

/** Natural Earth name -> friendly spoken/displayed name. */
export const NAME_OVERRIDES = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Congo': 'Republic of the Congo',
  'Central African Rep.': 'Central African Republic',
  'Dominican Rep.': 'Dominican Republic',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'Fr. S. Antarctic Lands': 'French Southern Lands',
  'Falkland Is.': 'Falkland Islands',
  'Solomon Is.': 'Solomon Islands',
  'N. Cyprus': 'Northern Cyprus',
  'Macedonia': 'North Macedonia',
  'eSwatini': 'Eswatini',
};

/** Friendly name for a Natural Earth country name. */
export function friendlyName(name) {
  if (!name) return 'Unknown';
  if (NAME_OVERRIDES[name]) return NAME_OVERRIDES[name];
  // Generic fallback expansion of NE abbreviations.
  return name
    .replace(/\bRep\.(?=\s|$)/g, 'Republic')
    .replace(/\bIs\.(?=\s|$)/g, 'Islands')
    .replace(/\bSt\.(?=\s|$)/g, 'Saint')
    .replace(/\bS\.(?=\s)/g, 'South')
    .replace(/\bN\.(?=\s)/g, 'North')
    .replace(/\bW\.(?=\s)/g, 'West')
    .replace(/\bE\.(?=\s)/g, 'East');
}

/** Regional-indicator flag emoji from an ISO alpha-2 code; white flag if invalid. */
export function flagEmoji(alpha2) {
  if (typeof alpha2 !== 'string' || !/^[A-Za-z]{2}$/.test(alpha2)) return '🏳️';
  return String.fromCodePoint(
    ...alpha2.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  );
}

/** Alpha-2 for a world-atlas feature id (string like "076" or number), or null. */
export function alpha2ForId(id) {
  if (id === undefined || id === null || id === '') return null;
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  return ISO_NUMERIC_TO_ALPHA2[n] || null;
}

/** Flag for a world-atlas feature id; neutral white flag when it has no ISO code. */
export function flagForId(id) {
  return flagEmoji(alpha2ForId(id));
}
