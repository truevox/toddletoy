/**
 * Continent + capital facts for every country feature in the globe dataset,
 * keyed by ISO alpha-2 code (or the Natural Earth name for the few features
 * that have no ISO code). Kept conservative: where a capital is contested or
 * unclear, the capital is simply omitted rather than guessed.
 */

export const CONTINENTS = {
  AF: 'Africa', AS: 'Asia', EU: 'Europe', NA: 'North America', SA: 'South America',
  OC: 'Oceania', AN: 'Antarctica', IO: 'Indian Ocean',
};
export const CONTINENT_ORDER = ['NA', 'SA', 'EU', 'AF', 'AS', 'OC', 'AN', 'IO'];

// "<key> <continent> <capital?>"  (capital may contain spaces)
const TABLE = `
AF AS Kabul|AL EU Tirana|DZ AF Algiers|AO AF Luanda|AR SA Buenos Aires|AM AS Yerevan|AU OC Canberra|AT EU Vienna
AZ AS Baku|BS NA Nassau|BD AS Dhaka|BY EU Minsk|BE EU Brussels|BZ NA Belmopan|BJ AF Porto-Novo|BT AS Thimphu
BO SA Sucre|BA EU Sarajevo|BW AF Gaborone|BR SA Brasília|BN AS Bandar Seri Begawan|BG EU Sofia|BF AF Ouagadougou
BI AF Gitega|KH AS Phnom Penh|CM AF Yaoundé|CA NA Ottawa|CF AF Bangui|TD AF N'Djamena|CL SA Santiago|CN AS Beijing
CO SA Bogotá|CD AF Kinshasa|CG AF Brazzaville|CR NA San José|CI AF Yamoussoukro|HR EU Zagreb|CU NA Havana
CY AS Nicosia|CZ EU Prague|DK EU Copenhagen|DJ AF Djibouti|DO NA Santo Domingo|EC SA Quito|EG AF Cairo
SV NA San Salvador|GQ AF Malabo|ER AF Asmara|EE EU Tallinn|SZ AF Mbabane|ET AF Addis Ababa|FK SA Stanley
FJ OC Suva|FI EU Helsinki|FR EU Paris|GA AF Libreville|GM AF Banjul|GE AS Tbilisi|DE EU Berlin|GH AF Accra
GR EU Athens|GL NA Nuuk|GT NA Guatemala City|GN AF Conakry|GW AF Bissau|GY SA Georgetown|HT NA Port-au-Prince
HN NA Tegucigalpa|HU EU Budapest|IS EU Reykjavik|IN AS New Delhi|ID AS Jakarta|IR AS Tehran|IQ AS Baghdad
IE EU Dublin|IT EU Rome|JM NA Kingston|JP AS Tokyo|JO AS Amman|KZ AS Astana|KE AF Nairobi|KP AS Pyongyang
KR AS Seoul|KW AS Kuwait City|KG AS Bishkek|LA AS Vientiane|LV EU Riga|LB AS Beirut|LS AF Maseru|LR AF Monrovia
LY AF Tripoli|LT EU Vilnius|LU EU Luxembourg|MG AF Antananarivo|MW AF Lilongwe|MY AS Kuala Lumpur|ML AF Bamako
MR AF Nouakchott|MX NA Mexico City|MD EU Chișinău|MN AS Ulaanbaatar|ME EU Podgorica|MA AF Rabat|MZ AF Maputo
MM AS Naypyidaw|NA AF Windhoek|NP AS Kathmandu|NL EU Amsterdam|NC OC Nouméa|NZ OC Wellington|NI NA Managua
NE AF Niamey|NG AF Abuja|MK EU Skopje|NO EU Oslo|OM AS Muscat|PK AS Islamabad|PA NA Panama City|PG OC Port Moresby
PY SA Asunción|PE SA Lima|PH AS Manila|PL EU Warsaw|PT EU Lisbon|PR NA San Juan|QA AS Doha|RO EU Bucharest
RU EU Moscow|RW AF Kigali|SA AS Riyadh|SN AF Dakar|RS EU Belgrade|SL AF Freetown|SK EU Bratislava|SI EU Ljubljana
SB OC Honiara|SO AF Mogadishu|ZA AF Pretoria|SS AF Juba|ES EU Madrid|LK AS Sri Jayawardenepura Kotte|SD AF Khartoum
SR SA Paramaribo|SE EU Stockholm|CH EU Bern|SY AS Damascus|TW AS Taipei|TJ AS Dushanbe|TZ AF Dodoma|TH AS Bangkok
TL AS Dili|TG AF Lomé|TT NA Port of Spain|TN AF Tunis|TR AS Ankara|TM AS Ashgabat|UG AF Kampala|UA EU Kyiv
AE AS Abu Dhabi|GB EU London|US NA Washington, D.C.|UY SA Montevideo|UZ AS Tashkent|VU OC Port Vila|VE SA Caracas
VN AS Hanoi|YE AS Sana'a|ZM AF Lusaka|ZW AF Harare|XK EU Pristina
IL AS|PS AS|EH AF|AQ AN|TF IO|Somaliland AF|N. Cyprus AS
`;

const META = {};
for (const row of TABLE.split('|').flatMap(l => l.split('\n')).map(s => s.trim()).filter(Boolean)) {
  const m = /^(.+?) (AF|AS|EU|NA|SA|OC|AN|IO)(?: (.+))?$/.exec(row);
  if (m) META[m[1]] = { continent: CONTINENTS[m[2]], continentCode: m[2], capital: m[3] || null };
}

/** Table key for a decoded country (alpha-2, or the dataset name when there is no ISO code). */
export function metaKey(country) {
  if (country.alpha2) return country.alpha2;
  return country.rawName === 'Kosovo' ? 'XK' : country.rawName;
}

/** { continent, continentCode, capital|null } or null when unknown. */
export function metaFor(country) {
  return META[metaKey(country)] || null;
}

export const META_KEYS = Object.keys(META);

/** Countries a young child is likely to have heard of (used to weight picks). */
export const WELL_KNOWN = new Set(
  'US CA MX BR AR PE CO CL GB FR DE ES IT PT NL EG ZA KE NG MA ET TZ MG IN CN JP KR TH VN ID PH AU NZ RU SA TR IR GR NO SE FI IE IS CU JM CH AT PL UA BO VE AF PK MN KZ GL'.split(' ')
);
