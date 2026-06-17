// ══════════════════════════════════════════════
//  DJ MAP — DATA LOADER от Google Sheets
//  Колонки: name,country,city,area,type,genre,rating,
//  capacity,description,fee,nights,isPremium,
//  contactName,contactRole,whatsapp,telegram,instagram,
//  line,email,instagramVenue,mapurl
// ══════════════════════════════════════════════

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBfahfsaXAR4P83HclALQqaZO-C9MOKl7incfyzqGdrr2-kimGHeNTIQQgzJ-hv1NKlcpVqrTDz3d0/pub?output=csv';

// Карта: название страны → id
const COUNTRY_NAME_MAP = {
  'thailand':'thailand','таиланд':'thailand',
  'vietnam':'vietnam','вьетнам':'vietnam',
  'cambodia':'cambodia','камбоджа':'cambodia',
  'india':'india','индия':'india',
  'malaysia':'malaysia','малайзия':'malaysia',
  'japan':'japan','япония':'japan',
  'china':'china','китай':'china',
  'korea':'korea','корея':'korea',
  'indonesia':'indonesia','индонезия':'indonesia',
};

// Карта: тип заведения → нормализованный
const TYPE_MAP = {
  'nightclub':'Nightclub','night club':'Nightclub',
  'beach club':'Beach Club','beachclub':'Beach Club',
  'rooftop bar':'Rooftop Bar','rooftop':'Rooftop Bar',
  'bar & club':'Bar & Club','bar and club':'Bar & Club',
  'club':'Club',
  'lounge':'Lounge',
  'music shop':'Music Shop','musicshop':'Music Shop',
  'service center':'Service Center','service':'Service Center',
};

function normalizeCountry(val) {
  return COUNTRY_NAME_MAP[(val||'').toLowerCase().trim()] || (val||'').toLowerCase().trim();
}

function normalizeType(val) {
  return TYPE_MAP[(val||'').toLowerCase().trim()] || val || 'Nightclub';
}

// Парсинг одной CSV строки
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

// Загружаем и парсим данные
async function loadSheetData() {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const lines = text.split('\n').map(l => l.replace('\r', '')).filter(l => l.trim());
    if (lines.length < 2) throw new Error('Empty sheet');

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    const rows = lines.slice(1).map((line, idx) => {
      const vals = parseCSVLine(line);
      const get = (key) => {
        const i = headers.indexOf(key);
        return i >= 0 ? (vals[i] || '').trim() : '';
      };

      const name = get('name');
      if (!name) return null;

      // Жанры: через запятую или точку с запятой
      const genreRaw = get('genre');
      const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

      // Ночи: через запятую или точку с запятой
      const nightsRaw = get('nights');
      const nights = nightsRaw ? nightsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

      // Контакт
      const contactName = get('contactname');
      const contacts = contactName ? [{
        name: contactName,
        role: get('contactrole') || 'Менеджер',
        whatsapp: get('whatsapp'),
        telegram: get('telegram'),
        instagram: get('instagram'),
        line: get('line'),
        email: get('email'),
      }] : [];

      return {
        id: 1000 + idx,
        name,
        country: normalizeCountry(get('country')),
        city: get('city'),
        area: get('area'),
        type: normalizeType(get('type')),
        genre,
        rating: parseFloat(get('rating')) || 4.5,
        capacity: parseInt(get('capacity')) || 0,
        description: get('description'),
        fee: get('fee'),
        nights,
        isPremium: ['true','1','yes','да'].includes(get('ispremium').toLowerCase()),
        contacts,
        instagram: get('instagramvenue') || get('instagram'),
        mapurl: get('mapurl'),
        brands: get('brands') || '',
        workingHours: get('workinghours') || get('hours') || '',
      };
    }).filter(Boolean);

    const serviceTypes = ['Music Shop', 'Service Center'];
    window.venuesFromSheet = rows.filter(r => !serviceTypes.includes(r.type));
    window.servicesFromSheet = rows.filter(r => serviceTypes.includes(r.type));

    console.log(`✅ Google Sheets: ${window.venuesFromSheet.length} заведений, ${window.servicesFromSheet.length} сервисов`);
    return true;
  } catch (e) {
    console.warn('⚠️ Sheets недоступен, используются локальные данные:', e.message);
    window.venuesFromSheet = null;
    window.servicesFromSheet = null;
    return false;
  }
}

window.sheetDataReady = loadSheetData();
