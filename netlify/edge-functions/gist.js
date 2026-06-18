// Gunners Den — Netlify Edge Function (GitHub Gist Proxy)
// Keeps the GitHub token server-side in a Netlify environment variable.
// Frontend calls /api/gist — token is never exposed in browser source.

const GIST_ID   = '74957b0dc96c9ea517d45fc9a4c94e30';
const GIST_FILE = 'gunnersden.json';
const GIST_API  = `https://api.github.com/gists/${GIST_ID}`;

export default async function handler(request) {
  const token = Deno.env.get('GIST_TOKEN');

  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const ghHeaders = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  // ── READ ──────────────────────────────────────────────────────
  if (request.method === 'GET') {
    try {
      const r    = await fetch(GIST_API, { headers: ghHeaders });
      const gist = await r.json();
      const content = gist.files?.[GIST_FILE]?.content || '{}';
      return new Response(content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response('{}', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ── WRITE ─────────────────────────────────────────────────────
  if (request.method === 'PATCH') {
    try {
      const body = await request.json();
      const r = await fetch(GIST_API, {
        method: 'PATCH',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(body) } } })
      });
      return new Response(r.ok ? 'ok' : 'error', {
        status: r.ok ? 200 : 500,
        headers: corsHeaders
      });
    } catch (e) {
      return new Response('error', { status: 500, headers: corsHeaders });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}

export const config = { path: '/api/gist' };
