// Gunners Den — Cloudflare Worker (Social Share Preview)
// Deploy this at: https://dash.cloudflare.com → Workers & Pages → Create Worker
// Then add a route: gunnersden.net/share* → this worker

const BIN_ID  = '6a2eb678da38895dfebee716';
const API_KEY = '$2a$10$Uh9yEH0a9qXYx3NGzQx6Ve8tzuiKRxNdWfoOJyE9aeKwxKMenvp6u';
const SITE    = 'https://gunnersden.net';

const DEFAULTS = {
  title : 'Gunners Den – Arsenal FC Fan Site',
  desc  : 'Independent Arsenal FC fan site covering Premier League news, match analysis, transfer updates and fan opinions.',
  image : 'https://gunnersden.net/og-image.png'
};

// Pick best image: dedicated cover → first <img> in body → site logo
function pickImage(art) {
  if (art.image && art.image.trim()) return art.image.trim();
  if (art.body) {
    const m = art.body.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && m[1]) return m[1];
  }
  return DEFAULTS.image;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const id  = url.searchParams.get('id') || '';

    let title = DEFAULTS.title;
    let desc  = DEFAULTS.desc;
    let image = DEFAULTS.image;

    if (id) {
      try {
        const res  = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
          headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
        });
        const data = await res.json();
        const arts = [...(data.articles || []), ...(data.fanArticles || [])];
        const art  = arts.find(a => String(a.id) === String(id));

        if (art) {
          title = (art.title  || DEFAULTS.title) + ' | Gunners Den';
          desc  = art.excerpt || (art.body || '').replace(/<[^>]+>/g, '').slice(0, 200);
          image = pickImage(art);
        }
      } catch (_) {}
    }

    const shareUrl   = `${SITE}/share?id=${id}`;
    const redirectTo = `${SITE}/#art-${id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${h(title)}</title>

<meta property="og:type"        content="article">
<meta property="og:site_name"   content="Gunners Den">
<meta property="og:url"         content="${h(shareUrl)}">
<meta property="og:title"       content="${h(title)}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:image"       content="${h(image)}">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${h(title)}">
<meta name="twitter:description" content="${h(desc)}">
<meta name="twitter:image"       content="${h(image)}">

<meta http-equiv="refresh" content="0;url=${h(redirectTo)}">
</head>
<body>
<script>window.location.replace(${JSON.stringify(redirectTo)});</script>
<p>Loading article… <a href="${h(redirectTo)}">Click here</a> if not redirected.</p>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

function h(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
