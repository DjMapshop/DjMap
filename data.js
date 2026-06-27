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

// FIX: TYPE_MAP values must match exactly what the app expects in TYPE_DISPLAY / TYPE_DISPLAY_F
const TYPE_MAP = {
  'nightclub':'Nightclub','night club':'Nightclub','ночной клуб':'Nightclub','club':'Nightclub','клуб':'Nightclub',
  'beach club':'Beach Club','beachclub':'Beach Club','бич клуб':'Beach Club',
  'rooftop bar':'Rooftop Bar','rooftop':'Rooftop Bar',
  // Bar & Club / Bar / Lounge → all merged into Nightclub
  'bar & club':'Nightclub','bar and club':'Nightclub',
  'bar':'Nightclub','lounge':'Nightclub','лаунж':'Nightclub',
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
    'pick time techno':'Pick Time Techno',
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

  // FIX: detect column indices once for Promo Group column-shift handling
  const iName     = headers.indexOf('name');
  const iType     = headers.indexOf('type');
  const iCountry  = headers.indexOf('country');
  const iCity     = headers.indexOf('city');
  const iArea     = headers.indexOf('area');
  const iRating   = headers.indexOf('rating');
  const iGenre    = headers.indexOf('genre');
  const iNights   = headers.indexOf('nights');
  const iFee      = headers.indexOf('fee');
  const iWorkDays = headers.indexOf('workingdays');
  const iDesc     = headers.indexOf('description');
  const iIgVenue  = headers.indexOf('instagramvenue');
  const iMapUrl   = headers.indexOf('mapurl');
  const iBrands   = headers.indexOf('brands');
  const iHours    = headers.indexOf('workinghours');
  const iPhoto1   = headers.indexOf('photo1');
  const iPhoto2   = headers.indexOf('photo2');
  const iPhoto3   = headers.indexOf('photo3');
  const iHot      = headers.indexOf('hot');
  const iPremium  = headers.indexOf('ispremium');
  const iCapacity = headers.indexOf('capacity');
  const iCName    = Math.max(headers.indexOf('contactname'), headers.indexOf('contactname'));
  const iCRole    = Math.max(headers.indexOf('contactrole'), headers.indexOf('contactrole'));
  const iWhatsApp = headers.indexOf('whatsapp');
  const iTelegram = headers.indexOf('telegram');
  const iLine     = headers.indexOf('line');
  const iInstagram= headers.indexOf('instagram');
  const iEmail    = headers.indexOf('email');

  const rows = lines.slice(1).map((line, idx) => {
    const vals = parseCSVLine(line);

    // Safe column getter — returns '' for out-of-range indices
    const col = (i) => (i >= 0 && i < vals.length) ? (vals[i] || '').trim() : '';

    const name = col(iName);
    if (!name) return null; // skip truly empty rows

    const typeRaw = col(iType).toLowerCase();
    const type = TYPE_MAP[typeRaw] || col(iType) || 'Nightclub';

    // FIX: Promo Group rows often have empty fee and workingDays columns,
    // which causes a column shift for ALL subsequent columns.
    // Strategy: for Promo Group, read contact fields by exact header index (already done above),
    // so they are immune to missing-column shift errors.
    // The column-shift only happens when CSV has fewer commas than the header row.
    // parseCSVLine already pads to available commas — col() returns '' for missing indices,
    // so no extra shift logic needed here as long as headers are correct.

    const genreRaw = col(iGenre);
    const genre = genreRaw ? genreRaw.split(/[;,]/).map(s => normaliseGenre(s.trim())).filter(Boolean) : [];

    const nightsRaw = col(iNights);
    const nights = nightsRaw ? nightsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    // FIX: Support both contactName and contactname header variants
    const contactNameIdx = headers.indexOf('contactname') >= 0
      ? headers.indexOf('contactname')
      : headers.indexOf('contactName') >= 0
        ? headers.indexOf('contactName')
        : -1;
    const contactRoleIdx = headers.indexOf('contactrole') >= 0
      ? headers.indexOf('contactrole')
      : headers.indexOf('contactRole') >= 0
        ? headers.indexOf('contactRole')
        : -1;

    const contactName = col(contactNameIdx);
    const contacts = contactName ? [{
      name: contactName,
      role: col(contactRoleIdx) || 'Manager',
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

    function driveUrl(url) {
      if (!url) return '';
      const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800';
      const m2 = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w800';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return '';
    }

    const photo1 = driveUrl(col(iPhoto1));
    const photo2 = driveUrl(col(iPhoto2));
    const photo3 = driveUrl(col(iPhoto3));
    const photos = [photo1, photo2, photo3].filter(Boolean);

    return {
      id: 1000 + idx,
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
      instagram:     col(iIgVenue) || col(iInstagram),
      venueInstagram:col(iIgVenue),
      mapurl:        col(iMapUrl),
      brands:        col(iBrands) || '',
      workingHours:  col(iHours) || '',
      photo1,
      photos,
      category: ['Music Shop','Service Center','Rental'].includes(type)
        ? (type === 'Music Shop' ? 'shop' : type === 'Service Center' ? 'service' : 'rental')
        : null,
    };
  }).filter(Boolean);

  // All rows go to venues — service section has its own dedicated sheet
  window.venuesFromSheet = rows;
  window.servicesFromSheet = null;

  console.log(`✅ Loaded: ${window.venuesFromSheet.length} venues`);
  return true;
}

window.sheetDataReady = loadSheetData();
