// ══════════════════════════════════════════════
//  DJ MAP — DATA LOADER
//  Main venues:   1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo
//  Service Ctrs:  1TrYuCqj2j-Cr28ef3SyY0aObcYgdK47ikXBNUY9APSs
//  Shops/FB:      1UPDzvZWsQaamHxbo2eW2mW3l3E07sh7OGgGR5hqxCn8
// ══════════════════════════════════════════════

const SHEET_ID       = '1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo';
const SHEET_ID_SVC   = '1TrYuCqj2j-Cr28ef3SyY0aObcYgdK47ikXBNUY9APSs';
const SHEET_ID_SHOPS = '1UPDzvZWsQaamHxbo2eW2mW3l3E07sh7OGgGR5hqxCn8';

const SHEET_CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Лист1`;
const SHEET_CSV_URL2 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const SVC_CSV_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID_SVC}/gviz/tq?tqx=out:csv`;
const SVC_CSV_URL2   = `https://docs.google.com/spreadsheets/d/${SHEET_ID_SVC}/export?format=csv&gid=0`;
const SHOPS_CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID_SHOPS}/gviz/tq?tqx=out:csv`;
const SHOPS_CSV_URL2 = `https://docs.google.com/spreadsheets/d/${SHEET_ID_SHOPS}/export?format=csv&gid=0`;

const COUNTRY_MAP = {
  'thailand':'thailand','таиланд':'thailand',
  'vietnam':'vietnam','вьетнам':'vietnam',
  'indonesia':'indonesia','индонезия':'indonesia','bali':'indonesia',
  'uae':'uae','дубай':'uae','dubai':'uae','united arab emirates':'uae','оаэ':'uae',
  'japan':'japan','япония':'japan',
  'india':'india','индия':'india',
  'hong kong':'hongkong','гонконг':'hongkong','hongkong':'hongkong',
  'singapore':'singapore','сингапур':'singapore',
  'korea':'korea','корея':'korea','south korea':'korea','south_korea':'korea',
  'malaysia':'malaysia','малайзия':'malaysia',
  'philippines':'philippines','филиппины':'philippines',
  'china':'china','китай':'china',
  'turkey':'turkey','турция':'turkey',
  'saudi arabia':'saudi','saudi_arabia':'saudi','саудовская аравия':'saudi',
  'spain':'spain','испания':'spain',
  'portugal':'portugal','португалия':'portugal',
  'morocco':'morocco','марокко':'morocco',
  'pakistan':'pakistan','пакистан':'pakistan',
  'uganda':'uganda','уганда':'uganda',
  'cambodia':'cambodia','камбоджа':'cambodia',
};

const TYPE_MAP = {
  'nightclub':'Nightclub','night club':'Nightclub','ночной клуб':'Nightclub','club':'Nightclub','клуб':'Nightclub',
  'beach club':'Beach Club','beachclub':'Beach Club','бич клуб':'Beach Club',
  'rooftop bar':'Rooftop Bar','rooftop':'Rooftop Bar',
  'bar & club':'Nightclub','bar and club':'Nightclub','bar':'Nightclub','lounge':'Nightclub','лаунж':'Nightclub',
  'promo group':'Promo Group','promo':'Promo Group',
  'restaurant':'Restaurant','ресторан':'Restaurant',
  'music shop':'Music Shop','музыкальный магазин':'Music Shop','shop':'Music Shop','магазин':'Music Shop',
  'service center':'Service Center','сервисный центр':'Service Center','service':'Service Center','сервис':'Service Center',
  'rental':'Rental','аренда':'Rental','аренда оборудования':'Rental','equipment rental':'Rental',
  'facebook group shop':'Facebook Group Shop','facebook group':'Facebook Group Shop','fb group':'Facebook Group Shop','fb shop':'Facebook Group Shop',
};

function parseCSVLine(line) {
  const vals = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
    else cur += ch;
  }
  vals.push(cur);
  return vals.map(v => v.replace(/^"|"$/g, '').trim());
}

async function tryFetch(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function normaliseGenre(g) {
  const map = {
    'afro house':'Afro House','organic house':'Organic House','melodic house':'Melodic House',
    'progressive house':'Progressive House','latin house':'Latin House','tech house':'Tech House',
    'minimal house':'Minimal House','indie dance':'Indie Dance','melodic techno':'Melodic Techno',
    'minimal techno':'Minimal Techno','hard techno':'Hard Techno','raw techno':'Raw Techno',
    'new disco':'New Disco','disco house':'Disco House','world music':'World Music',
    'psy trance':'Psy Trance','hip hop':'Hip Hop','house':'House','techno':'Techno',
    'edm':'EDM','rnb':'RnB','r&b':'RnB','funk':'Funk','downtempo':'Downtempo',
  };
  return map[g.toLowerCase()] || g.trim();
}

// Parse a CSV text into venue/service objects
function parseSheetCSV(text, idOffset, defaultType) {
  const lines = text.split('\n').map(l => l.replace('\r','')).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  const iName      = headers.indexOf('name');
  const iType      = headers.indexOf('type');
  const iCountry   = headers.indexOf('country');
  const iCity      = headers.indexOf('city');
  const iArea      = headers.indexOf('area');
  const iRating    = headers.indexOf('rating');
  const iGenre     = headers.indexOf('genre');
  const iNights    = headers.indexOf('nights');
  const iFee       = headers.indexOf('fee');
  const iDesc      = headers.indexOf('description');
  const iIgVenue   = headers.indexOf('instagramvenue');
  const iMapUrl    = headers.indexOf('mapurl');
  const iBrands    = headers.indexOf('brands');
  const iHours     = headers.indexOf('workinghours');
  const iPhoto1    = headers.indexOf('photo1');
  const iPhoto2    = headers.indexOf('photo2');
  const iPhoto3    = headers.indexOf('photo3');
  const iHot       = headers.indexOf('hot');
  const iPremium   = headers.indexOf('ispremium');
  const iCapacity  = headers.indexOf('capacity');
  const iCName     = headers.indexOf('contactname');
  const iCRole     = headers.indexOf('contactrole');
  const iWhatsApp  = headers.indexOf('whatsapp');
  const iTelegram  = headers.indexOf('telegram');
  const iLine      = headers.indexOf('line');
  const iInstagram = headers.indexOf('instagram');
  const iEmail     = headers.indexOf('email');
  const iWebsite   = headers.indexOf('website');

  return lines.slice(1).map((line, idx) => {
    const vals = parseCSVLine(line);
    const col  = (i) => (i >= 0 && i < vals.length) ? (vals[i] || '').trim() : '';

    const name = col(iName);
    if (!name) return null;

    const typeRaw = col(iType).toLowerCase();
    const type = TYPE_MAP[typeRaw] || (defaultType || col(iType) || 'Nightclub');

    const genreRaw = col(iGenre);
    const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => normaliseGenre(s.trim())).filter(Boolean) : [];

    const nightsRaw = col(iNights);
    const nights = nightsRaw ? nightsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    const contactName = col(iCName);
    const contacts = contactName ? [{
      name:      contactName,
      role:      col(iCRole) || 'Manager',
      whatsapp:  col(iWhatsApp),
      telegram:  col(iTelegram),
      instagram: col(iInstagram),
      line:      col(iLine),
      email:     col(iEmail),
    }] : [];

    const countryRaw = col(iCountry).toLowerCase().trim();
    const country = COUNTRY_MAP[countryRaw] || countryRaw.replace(/\s+/g,'');

    const isPremiumRaw = col(iPremium) || col(iHot);
    const isPremium = ['true','1','yes','да'].includes((isPremiumRaw || '').toLowerCase());

    // Determine category for service section
    const SVC_TYPES = ['Music Shop','Service Center','Rental','Facebook Group Shop'];
    const category = type === 'Music Shop' ? 'shop'
      : type === 'Service Center' ? 'service'
      : type === 'Rental' ? 'rental'
      : type === 'Facebook Group Shop' ? 'groups'
      : null;

    return {
      id: idOffset + idx,
      name,
      country,
      city:         col(iCity),
      area:         col(iArea),
      type,
      genre,
      rating:       parseFloat(col(iRating)) || 4.5,
      capacity:     parseInt(col(iCapacity)) || 0,
      description:  col(iDesc),
      fee:          col(iFee),
      nights,
      isPremium,
      contacts,
      instagram:      col(iIgVenue) || col(iInstagram),
      venueInstagram: col(iIgVenue),
      website:        col(iWebsite) || '',
      mapurl:         col(iMapUrl),
      brands:         col(iBrands) || '',
      workingHours:   col(iHours) || '',
      photos:         [],
      category,
    };
  }).filter(Boolean);
}

async function loadSheetData() {
  // ── 1. Main venues sheet ──────────────────────────────────────────────────
  let venueRows = [];
  try {
    let text = '';
    try { text = await tryFetch(SHEET_CSV_URL); }
    catch(e) { text = await tryFetch(SHEET_CSV_URL2); }
    venueRows = parseSheetCSV(text, 1000, 'Nightclub');
    console.log(`✅ Venues loaded: ${venueRows.length}`);
  } catch(e) {
    console.warn('⚠️ Main sheet unavailable:', e.message);
  }

  // ── 2. Service Centers sheet ──────────────────────────────────────────────
  let svcRows = [];
  try {
    let text = '';
    try { text = await tryFetch(SVC_CSV_URL); }
    catch(e) { text = await tryFetch(SVC_CSV_URL2); }
    svcRows = parseSheetCSV(text, 3000, 'Service Center');
    console.log(`✅ Service Centers loaded: ${svcRows.length}`);
  } catch(e) {
    console.warn('⚠️ Service sheet unavailable:', e.message);
  }

  // ── 3. Shops + FB Groups sheet ────────────────────────────────────────────
  let shopRows = [];
  try {
    let text = '';
    try { text = await tryFetch(SHOPS_CSV_URL); }
    catch(e) { text = await tryFetch(SHOPS_CSV_URL2); }
    shopRows = parseSheetCSV(text, 5000, 'Music Shop');
    console.log(`✅ Shops/FB loaded: ${shopRows.length}`);
  } catch(e) {
    console.warn('⚠️ Shops sheet unavailable:', e.message);
  }

  // ── Split: venues vs services ─────────────────────────────────────────────
  const SVC_TYPES = ['Music Shop','Service Center','Rental','Facebook Group Shop'];
  const allRows   = venueRows;

  window.venuesFromSheet   = allRows.filter(v => !SVC_TYPES.includes(v.type));
  window.servicesFromSheet = [
    ...allRows.filter(v => SVC_TYPES.includes(v.type)),
    ...svcRows,
    ...shopRows,
  ];

  console.log(`✅ Final: ${window.venuesFromSheet.length} venues, ${window.servicesFromSheet.length} services`);
  return true;
}

window.sheetDataReady = loadSheetData();
