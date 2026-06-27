// ══════════════════════════════════════════════
//  DJ MAP — DATA LOADER
// ══════════════════════════════════════════════

const SHEET_ID       = '1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo';
const SHEET_ID_SVC   = '1TrYuCqj2j-Cr28ef3SyY0aObcYgdK47ikXBNUY9APSs';
const SHEET_ID_SHOPS = '1UPDzvZWsQaamHxbo2eW2mW3l3E07sh7OGgGR5hqxCn8';

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
  'bar & club':'Bar','bar and club':'Bar','bar':'Bar','lounge':'Bar','лаунж':'Bar',
  'festival':'Festival','фестиваль':'Festival',
  'promo group':'Promo Group','promo':'Promo Group',
  'restaurant':'Restaurant','ресторан':'Restaurant',
  'music shop':'Music Shop','музыкальный магазин':'Music Shop','shop':'Music Shop','магазин':'Music Shop',
  'service center':'Service Center','сервисный центр':'Service Center','service':'Service Center','сервис':'Service Center','service centre':'Service Center',
  'rental':'Rental','аренда':'Rental','аренда оборудования':'Rental','equipment rental':'Rental',
  'facebook group shop':'Facebook Group Shop','facebook group':'Facebook Group Shop','fb group':'Facebook Group Shop','fb shop':'Facebook Group Shop','facebook shop':'Facebook Group Shop',
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

// Try multiple URL variants for a sheet
async function fetchSheet(sheetId, sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  const encoded = sheetName ? encodeURIComponent(sheetName) : null;
  const urls = encoded
    ? [
        `${base}/gviz/tq?tqx=out:csv&sheet=${encoded}`,
        `${base}/export?format=csv&gid=0`,
      ]
    : [
        `${base}/gviz/tq?tqx=out:csv&sheet=%D0%9B%D0%B8%D1%81%D1%821`,
        `${base}/gviz/tq?tqx=out:csv`,
        `${base}/export?format=csv&gid=0`,
      ];
  for (const url of urls) {
    try {
      const text = await tryFetch(url);
      if (text && text.length > 50 && !text.includes('<!DOCTYPE')) {
        console.log(`✅ Loaded from: ${url}`);
        return text;
      }
    } catch(e) { /* try next */ }
  }
  throw new Error(`All URLs failed for sheet ${sheetId}`);
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

function parseSheetCSV(text, idOffset, defaultType) {
  const lines = text.split('\n').map(l => l.replace('\r','')).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  console.log(`📋 Headers [offset=${idOffset}]:`, headers.join(', '));

  const col = (vals, key) => {
    const i = headers.indexOf(key);
    return (i >= 0 && i < vals.length) ? (vals[i] || '').trim() : '';
  };

  return lines.slice(1).map((line, idx) => {
    const vals = parseCSVLine(line);
    const g = (key) => col(vals, key);

    const name = g('name');
    if (!name) return null;

    const typeRaw = g('type').toLowerCase();
    const type = TYPE_MAP[typeRaw] || defaultType || g('type') || 'Music Shop';

    const category = type === 'Music Shop' ? 'shop'
      : type === 'Service Center' ? 'service'
      : type === 'Rental' ? 'rental'
      : type === 'Facebook Group Shop' ? 'groups'
      : null;

    const genreRaw = g('genre');
    const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => normaliseGenre(s.trim())).filter(Boolean) : [];

    // Support multiple column name variants
    const contactName = g('contactname') || g('contact name') || g('contact') || g('manager') || name;
    const contactRole = g('contactrole') || g('contact role') || g('role') || 'Manager';
    const whatsapp  = g('whatsapp') || g('whats app') || g('phone') || g('tel') || '';
    const telegram  = g('telegram') || g('tg') || '';
    const instagram = g('instagram') || g('ig') || '';
    const lineVal   = g('line') || '';
    const email     = g('email') || g('e-mail') || '';

    const website  = g('website') || '';

    const contacts = (whatsapp || telegram || instagram || lineVal || email || website) ? [{
      name:      contactName,
      role:      contactRole,
      whatsapp,
      telegram,
      instagram,
      line:      lineVal,
      email,
      website,
    }] : [];

    const countryRaw = g('country').toLowerCase().trim();
    const country = COUNTRY_MAP[countryRaw] || countryRaw.replace(/\s+/g,'');

    const isPremiumRaw = g('ispremium') || g('hot');
    const isPremium = ['true','1','yes','да'].includes(isPremiumRaw.toLowerCase());

    return {
      id: idOffset + idx,
      name,
      country,
      city:         g('city'),
      area:         g('area'),
      type,
      category,
      genre,
      rating:       parseFloat(g('rating')) || 4.5,
      capacity:     parseInt(g('capacity')) || 0,
      description:  g('description'),
      fee:          g('fee'),
      nights:       (g('workingdays') || g('workingDays') || g('nights') || '').split(/[,;]/).map(s=>s.trim()).filter(Boolean),
      isPremium,
      contacts,
      instagram:      g('instagramvenue') || g('instagram'),
      venueInstagram: g('instagramvenue'),
      website:        g('website') || '',
      mapurl:         g('mapurl'),
      brands:         g('brands') || '',
      workingHours:   g('workinghours') || g('workingdays') || g('workingDays') || '',
      photos: [],
    };
  }).filter(Boolean);
}

async function loadSheetData() {
  const SVC_TYPES = ['Music Shop','Service Center','Rental','Facebook Group Shop'];

  // ── 1. Main venues ────────────────────────────────────────────────────────
  let venueRows = [], serviceRowsFromMain = [];
  try {
    const text = await fetchSheet(SHEET_ID, 'Лист1');
    const all = parseSheetCSV(text, 1000, 'Nightclub');
    venueRows = all.filter(v => !SVC_TYPES.includes(v.type));
    serviceRowsFromMain = all.filter(v => SVC_TYPES.includes(v.type));
    console.log(`✅ Main: ${venueRows.length} venues, ${serviceRowsFromMain.length} services`);
  } catch(e) {
    console.warn('⚠️ Main sheet failed:', e.message);
  }

  // ── 2. Service Centers ────────────────────────────────────────────────────
  let svcRows = [];
  try {
    const text = await fetchSheet(SHEET_ID_SVC, 'dj service centers');
    svcRows = parseSheetCSV(text, 3000, 'Service Center');
    console.log(`✅ Service Centers: ${svcRows.length}`);
  } catch(e) {
    console.warn('⚠️ Service Centers sheet failed:', e.message);
  }

  // ── 3. Shops + FB Groups ──────────────────────────────────────────────────
  let shopRows = [];
  try {
    const text = await fetchSheet(SHEET_ID_SHOPS, 'dj music shops');
    shopRows = parseSheetCSV(text, 5000, 'Music Shop');
    console.log(`✅ Shops/FB: ${shopRows.length}`);
  } catch(e) {
    console.warn('⚠️ Shops sheet failed:', e.message);
  }

  window.venuesFromSheet   = venueRows;
  window.servicesFromSheet = [...serviceRowsFromMain, ...svcRows, ...shopRows];

  console.log(`📊 Total: ${window.venuesFromSheet.length} venues, ${window.servicesFromSheet.length} services`);
  return true;
}

window.sheetDataReady = loadSheetData();
