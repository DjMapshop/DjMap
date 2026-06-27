// ══════════════════════════════════════════════
//  DJ MAP — DATA LOADER
//  Google Sheets ID: 1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo
// ══════════════════════════════════════════════

const SHEET_ID = '1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Лист1`;
const SHEET_CSV_URL2 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const COUNTRY_MAP = {
  // Thailand
  'thailand':'thailand','таиланд':'thailand',
  // Vietnam
  'vietnam':'vietnam','вьетнам':'vietnam',
  // Indonesia
  'indonesia':'indonesia','индонезия':'indonesia','bali':'indonesia',
  // UAE
  'uae':'uae','дубай':'uae','dubai':'uae','united arab emirates':'uae','оаэ':'uae',
  // Japan
  'japan':'japan','япония':'japan',
  // India
  'india':'india','индия':'india',
  // Hong Kong
  'hong kong':'hongkong','гонконг':'hongkong','hongkong':'hongkong',
  // Singapore
  'singapore':'singapore','сингапур':'singapore',
  // South Korea
  'korea':'korea','корея':'korea','south korea':'korea','south_korea':'korea',
  // Malaysia
  'malaysia':'malaysia','малайзия':'malaysia',
  // Philippines
  'philippines':'philippines','филиппины':'philippines',
  // China
  'china':'china','китай':'china',
  // Turkey
  'turkey':'turkey','турция':'turkey',
  // Saudi Arabia
  'saudi arabia':'saudi','saudi_arabia':'saudi','саудовская аравия':'saudi',
  // Spain
  'spain':'spain','испания':'spain',
  // Portugal
  'portugal':'portugal','португалия':'portugal',
  // Morocco
  'morocco':'morocco','марокко':'morocco',
  // Pakistan
  'pakistan':'pakistan','пакистан':'pakistan',
  // Uganda
  'uganda':'uganda','уганда':'uganda',
  // Cambodia (legacy)
  'cambodia':'cambodia','камбоджа':'cambodia',
};

const TYPE_MAP = {
  'nightclub':'Nightclub','night club':'Nightclub','ночной клуб':'Nightclub',
  'beach club':'Beach Club','beachclub':'Beach Club','бич клуб':'Beach Club',
  'rooftop bar':'Rooftop Bar','rooftop':'Rooftop Bar',
  'bar & club':'Bar','bar and club':'Bar',
  'bar':'Bar','клуб':'Nightclub','club':'Nightclub',
  'lounge':'Bar','лаунж':'Bar & Club',
  'promo group':'Promo Group','promo':'Promo Group',
  'restaurant':'Restaurant','ресторан':'Restaurant',
  'music shop':'Music Shop','музыкальный магазин':'Music Shop',
  'service center':'Service Center','сервисный центр':'Service Center',
  'rental':'Rental','аренда':'Rental','аренда оборудования':'Rental',
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


// Normalise genre casing
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
async function loadSheetData() {
  let text = '';
  try {
    text = await tryFetch(SHEET_CSV_URL);
  } catch(e1) {
    try {
      text = await tryFetch(SHEET_CSV_URL2);
    } catch(e2) {
      console.warn('⚠️ Google Sheets unavailable:', e2.message);
      window.venuesFromSheet = null;
      window.servicesFromSheet = null;
      return false;
    }
  }

  const lines = text.split('\n').map(l => l.replace('\r', '')).filter(l => l.trim());
  if (lines.length < 2) {
    console.warn('⚠️ Sheet is empty');
    return false;
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  console.log('📋 Columns:', headers);

  const rows = lines.slice(1).map((line, idx) => {
    const vals = parseCSVLine(line);
    const get = (key) => {
      const i = headers.indexOf(key.toLowerCase());
      return i >= 0 ? (vals[i] || '').trim() : '';
    };

    const name = get('name');
    if (!name) return null;

    const genreRaw = get('genre');
    const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => normaliseGenre(s.trim())).filter(Boolean) : [];

    const nightsRaw = get('nights');
    const nights = nightsRaw ? nightsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    const contactName = get('contactName') || get('contactname');
    const contacts = contactName ? [{
      name: contactName,
      role: get('contactRole') || get('contactrole') || 'Manager',
      whatsapp: get('whatsapp'),
      telegram: get('telegram'),
      instagram: get('instagram'),
      line: get('line'),
      email: get('email'),
    }] : [];

    const countryRaw = (get('country') || '').toLowerCase().trim();
    const country = COUNTRY_MAP[countryRaw] || countryRaw.replace(/\s+/g,'');

    const typeRaw = get('type').toLowerCase();
    const type = TYPE_MAP[typeRaw] || get('type') || 'Nightclub';

    const isPremiumRaw = get('isPremium') || get('ispremium') || get('hot');
    const isPremium = ['true','1','yes','да'].includes((isPremiumRaw || '').toLowerCase());

    function driveUrl(url) {
      if (!url) return '';
      // Google Drive direct link conversion
      const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800';
      // Google Drive open link
      const m2 = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w800';
      // Only return if it's a valid http URL
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return ''; // ignore @handles, website names, etc.
    }

    const photo1 = driveUrl(get('photo1'));
    const photo2 = driveUrl(get('photo2'));
    const photo3 = driveUrl(get('photo3'));
    const photos = [photo1, photo2, photo3].filter(Boolean);

    return {
      id: 1000 + idx,
      name,
      country,
      city: get('city'),
      area: get('area'),
      type,
      genre,
      rating: parseFloat(get('rating')) || 4.5,
      capacity: parseInt(get('capacity')) || 0,
      description: get('description'),
      fee: get('fee'),
      nights,
      isPremium,
      contacts,
      instagram: get('instagramvenue') || get('instagram'),
      venueInstagram: get('instagramvenue') || get('instagramVenue'),
      mapurl: get('mapurl'),
      brands: get('brands') || '',
      workingHours: get('workingHours') || get('workinghours') || '',
      photo1, // для сервис-раздела (логотип)
      photos,
      category: ['Music Shop','Service Center','Rental'].includes(type)
        ? (type === 'Music Shop' ? 'shop' : type === 'Service Center' ? 'service' : 'rental')
        : null,
    };
  }).filter(Boolean);

  // All rows go to venues - service section has its own dedicated sheet
  window.venuesFromSheet = rows;
  window.servicesFromSheet = null; // Reserved for dedicated service sheet

  console.log(`✅ Loaded: ${window.venuesFromSheet.length} venues`);
  return true;
}

window.sheetDataReady = loadSheetData();
