const BASE = process.env.ANIWATCH_API || 'https://api-aniwatch.onrender.com';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || '';
  if (!title) return Response.json({ episodes: [], hid: null });

  try {
    const sr = await fetch(
      `${BASE}/api/v2/hianime/search?keyword=${encodeURIComponent(title)}`,
      { cache: 'no-store' }
    );
    if (!sr.ok) return Response.json({ episodes: [], hid: null, err: `search ${sr.status}` });

    const sd = await sr.json();
    const animes = sd?.data?.animes || [];
    if (!animes.length) return Response.json({ episodes: [], hid: null, err: 'not found on HiAnime' });

    // Fuzzy match title
    const clean = title.toLowerCase().replace(/[^a-z0-9 ]/gi, '');
    let bestId = animes[0].id, bestScore = 0;
    for (const a of animes) {
      const n = (a.name || '').toLowerCase().replace(/[^a-z0-9 ]/gi, '');
      const maxLen = Math.max(clean.length, n.length);
      if (!maxLen) continue;
      let match = 0;
      for (let i = 0; i < Math.min(clean.length, n.length); i++) {
        if (clean[i] === n[i]) match++;
      }
      const pct = (match / maxLen) * 100;
      if (pct > bestScore) { bestScore = pct; bestId = a.id; }
    }

    const er = await fetch(
      `${BASE}/api/v2/hianime/anime/${bestId}/episodes`,
      { next: { revalidate: 1800 } }
    );
    if (!er.ok) return Response.json({ episodes: [], hid: bestId, err: `episodes ${er.status}` });

    const ed = await er.json();
    return Response.json({ episodes: ed?.data?.episodes || [], hid: bestId });

  } catch (e) {
    return Response.json({ episodes: [], hid: null, err: e.message });
  }
}
