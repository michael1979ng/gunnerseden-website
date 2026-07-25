/**
 * SSG Build Script — gunnersden.net
 * Fetches Gist CMS data and bakes it into index.html + sitemap.xml
 * Run: node build.js
 */
const https = require('https');
const fs    = require('fs');

const GIST_URL  = 'https://gist.githubusercontent.com/michael1979ng/74957b0dc96c9ea517d45fc9a4c94e30/raw/gunnersden.json';
const SITE_URL  = 'https://gunnersden.net';
const TEMPLATE  = 'index_redesign.html';
const OUT_HTML  = 'index.html';
const OUT_MAP   = 'sitemap.xml';

// ── HTTP GET with redirect follow ────────────────────────────
function get(url, attempt) {
  attempt = attempt || 0;
  return new Promise(function(resolve, reject) {
    https.get(url, { headers: { 'User-Agent': 'GunnersdenSSG/1.0', 'Cache-Control': 'no-cache' } }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (attempt > 5) return reject(new Error('Too many redirects'));
        return get(res.headers.location, attempt + 1).then(resolve).catch(reject);
      }
      var chunks = [];
      res.on('data', function(d) { chunks.push(d); });
      res.on('end', function() {
        var body = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error('JSON parse error: ' + e.message + '\nBody: ' + body.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

// ── Helpers ──────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(title) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g,'').trim()
    .replace(/\s+/g,'-').replace(/-+/g,'-').slice(0, 80);
}

// Category → page bucket (mirrors CAT_ROUTE in site JS)
var CAT_ROUTE = {
  'Breaking News':'news','Transfer':'news','Transfers':'news',
  'Injury News':'news','Press Conference':'news','Contract':'news',
  'Match Preview':'matchday','Match Report':'matchday','Player Ratings':'matchday',
  'Tactical Analysis':'matchday','Post-Match Reaction':'matchday','UCL':'matchday','Season Review':'matchday',
  'Legends':'history','Historic Match':'history','Title Winners':'history','Highbury':'history','Forgotten Hero':'history',
  'Player Profile':'features','Tactical Deep-Dive':'features','Arsenal Story':'features',
  'Debate':'features','Interview':'features','Opinion':'features',
  'Fan Perspective':'fanzone','Fan Zone':'fanzone',
  'Arsenal Women':'women',"Women's Team":'women','Women':'women'
};

// Render a single article card as HTML (mirrors renderCard in site JS)
function renderCard(art) {
  var slug = slugify(art.title);
  return '<div class="card" onclick="openArticle(\'' + esc(slug) + '\')" style="cursor:pointer">'
    + '<a href="/?article=' + esc(slug) + '" onclick="event.preventDefault()" '
    + 'aria-label="' + esc(art.title) + '" style="display:none"></a>'
    + '<div class="card-img">'
    + (art.image ? '<img src="' + esc(art.image) + '" alt="' + esc(art.title) + '" loading="lazy">' : '')
    + '<div class="card-img-overlay"></div>'
    + '<div class="card-cat">' + esc(art.cat || '') + '</div>'
    + '</div>'
    + '<div class="card-body">'
    + '<div class="card-title">' + esc(art.title || '') + '</div>'
    + '<div class="card-meta"><span>' + esc(art.date || '') + '</span><span>' + esc(art.author || '') + '</span></div>'
    + '<div class="card-ex">' + esc(art.excerpt || '') + '</div>'
    + '</div></div>';
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('[SSG] Fetching Gist data...');
  var data = await get(GIST_URL + '?t=' + Date.now());
  var articles = data.articles || [];
  console.log('[SSG] Got ' + articles.length + ' articles');

  if (!fs.existsSync(TEMPLATE)) {
    throw new Error('Template not found: ' + TEMPLATE);
  }
  var html = fs.readFileSync(TEMPLATE, 'utf8');

  // ── 1. Inject pre-baked state ─────────────────────────────
  var stateTag = '\n<script>window.__PRELOADED_STATE__=' + JSON.stringify(data) + ';</script>\n';
  html = html.replace('</head>', stateTag + '</head>');

  // ── 2. Pre-render featured grid (top 9 articles) ──────────
  var featuredHTML = articles.slice(0, 9).map(renderCard).join('')
    || '<div style="color:var(--gr);font-size:13px;padding:20px 0">No articles yet.</div>';
  html = html.replace(
    '<div class="news-grid" id="featuredGrid"></div>',
    '<div class="news-grid" id="featuredGrid">' + featuredHTML + '</div>'
  );

  // ── 3. Pre-render news grid ───────────────────────────────
  var newsArts = articles.filter(function(a) { return (CAT_ROUTE[a.cat] || 'news') === 'news'; });
  var newsHTML = newsArts.map(renderCard).join('')
    || '<div style="color:var(--gr);font-size:13px;padding:20px 0">No news articles yet.</div>';
  html = html.replace(
    '<div class="grid-3" id="newsGrid"></div>',
    '<div class="grid-3" id="newsGrid">' + newsHTML + '</div>'
  );

  // ── 4. Write index.html ───────────────────────────────────
  fs.writeFileSync(OUT_HTML, html, 'utf8');
  console.log('[SSG] Written ' + OUT_HTML);

  // ── 5. Generate sitemap.xml ───────────────────────────────
  var today = new Date().toISOString().slice(0, 10);
  var urls = ['  <url><loc>' + SITE_URL + '/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>' + today + '</lastmod></url>'];
  articles.forEach(function(a) {
    var slug = slugify(a.title);
    if (!slug) return;
    var date = (a.date || today).replace(/\//g, '-');
    // normalise DD-MM-YYYY → YYYY-MM-DD if needed
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      var parts = date.split('-');
      date = parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    urls.push('  <url><loc>' + SITE_URL + '/?article=' + slug + '</loc><lastmod>' + date + '</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>');
  });
  var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.join('\n') + '\n</urlset>';
  fs.writeFileSync(OUT_MAP, sitemap, 'utf8');
  console.log('[SSG] Written ' + OUT_MAP + ' (' + urls.length + ' URLs)');
  console.log('[SSG] Done.');
}

main().catch(function(e) { console.error('[SSG] FAILED:', e.message); process.exit(1); });
