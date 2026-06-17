// ══════════════════════════════════════════════
//  DJ MAP — DATA LOADER
//  Google Sheets ID: 1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo
// ══════════════════════════════════════════════

const SHEET_ID = '1ODl5g1ac57wEUHmnSY0naG2SgUXyLvisUJinSL6a9Qo';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Лист1`;
const SHEET_CSV_URL2 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const COUNTRY_MAP = {
  'thailand':'thailand','таиланд':'thailand',
  'vietnam':'vietnam','вьетнам':'vietnam',
  'cambodia':'cambodia','камбоджа':'cambodia',
  'india':'india','индия':'india',
  'malaysia':'malaysia','малайзия':'malaysia',
  'japan':'japan','япония':'japan',
  'china':'china','китай':'china',
  'korea':'korea','корея':'korea','south korea':'korea',
  'indonesia':'indonesia','индонезия':'indonesia',
};

const TYPE_MAP = {
  'nightclub':'Nightclub','night club':'Nightclub','ночной клуб':'Nightclub',
  'beach club':'Beach Club','beachclub':'Beach Club','бич клуб':'Beach Club',
  'rooftop bar':'Rooftop Bar','rooftop':'Rooftop Bar',
  'bar & club':'Bar & Club','bar and club':'Bar & Club',
  'club':'Club','клуб':'Club',
  'lounge':'Lounge','лаунж':'Lounge',
  'music shop':'Music Shop','музыкальный магазин':'Music Shop',
  'service center':'Service Center','сервисный центр':'Service Center',
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

async function loadSheetData() {
  let text = '';
  try {
    // Пробуем первый вариант URL
    text = await tryFetch(SHEET_CSV_URL);
  } catch(e1) {
    try {
      // Пробуем второй вариант
      text = await tryFetch(SHEET_CSV_URL2);
    } catch(e2) {
      console.warn('⚠️ Google Sheets недоступен:', e2.message);
      window.venuesFromSheet = null;
      window.servicesFromSheet = null;
      return false;
    }
  }

  const lines = text.split('\n').map(l => l.replace('\r', '')).filter(l => l.trim());
  if (lines.length < 2) {
    console.warn('⚠️ Таблица пустая');
    return false;
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  console.log('📋 Колонки:', headers);

  const rows = lines.slice(1).map((line, idx) => {
    const vals = parseCSVLine(line);
    const get = (key) => {
      const i = headers.indexOf(key.toLowerCase());
      return i >= 0 ? (vals[i] || '').trim() : '';
    };

    const name = get('name');
    if (!name) return null;

    const genreRaw = get('genre');
    const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    const nightsRaw = get('nights');
    const nights = nightsRaw ? nightsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    const contactName = get('contactName') || get('contactname');
    const contacts = contactName ? [{
      name: contactName,
      role: get('contactRole') || get('contactrole') || 'Менеджер',
      whatsapp: get('whatsapp'),
      telegram: get('telegram'),
      instagram: get('instagram'),
      line: get('line'),
      email: get('email'),
    }] : [];

    const countryRaw = get('country').toLowerCase();
    const country = COUNTRY_MAP[countryRaw] || countryRaw;

    const typeRaw = get('type').toLowerCase();
    const type = TYPE_MAP[typeRaw] || get('type') || 'Nightclub';

    const isPremiumRaw = get('isPremium') || get('ispremium');
    const isPremium = ['true','1','yes','да'].includes(isPremiumRaw.toLowerCase());

    return {
      id: 1000 + idx,
      name, country, city: get('city'), area: get('area'), type,
      genre, rating: parseFloat(get('rating')) || 4.5,
      capacity: parseInt(get('capacity')) || 0,
      description: get('description'), fee: get('fee'), nights,
      isPremium, contacts,
      instagram: get('instagramvenue') || get('instagram'),
      venueInstagram: get('instagramvenue') || get('instagramVenue'),
      mapurl: get('mapurl'),
      brands: get('brands') || '',
      workingHours: get('workingHours') || get('workinghours') || '',
    };
  }).filter(Boolean);

  const serviceTypes = ['Music Shop', 'Service Center'];
  window.venuesFromSheet = rows.filter(r => !serviceTypes.includes(r.type));
  window.servicesFromSheet = rows.filter(r => serviceTypes.includes(r.type));

  console.log(`✅ Загружено: ${window.venuesFromSheet.length} заведений, ${window.servicesFromSheet.length} сервисов`);
  return true;
}

window.sheetDataReady = loadSheetData();
