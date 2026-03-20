// GET /api/episodes?id={anilistId}&title={title}
// Uses @consumet/extensions to map AniList ID → GogoAnime episodes
// Consumet runs IN-PROCESS on Vercel — no external server needed

import { META } from '@consumet/extensions';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const anilistId = parseInt(searchParams.get('id') || '0', 10);
  const title     = searchParams.get('title') || '';

  if (!anilistId && !title) {
    return Response.json({ episodes: [], err: 'id or title required' });
  }

  try {
    // Consumet's AniList meta provider auto-maps AniList → GogoAnime
    const anilist = new META.Anilist();

    // Fetch anime info — this gives us episode list with GogoAnime IDs
    const info = await anilist.fetchAnimeInfo(String(anilistId));

    if (!info || !info.episodes || info.episodes.length === 0) {
      // Fallback: search by title directly on GogoAnime
      const { ANIME } = await import('@consumet/extensions');
      const gogo = new ANIME.Gogoanime();
      const results = await gogo.search(title);

      if (!results.results || results.results.length === 0) {
        return Response.json({ episodes: [], err: 'not found on GogoAnime' });
      }

      // Get episodes for best match
      const best = results.results[0];
      const animeInfo = await gogo.fetchAnimeInfo(best.id);

      return Response.json({
        episodes: (animeInfo.episodes || []).map(e => ({
          id:     e.id,
          number: e.number,
          title:  e.title || `Episode ${e.number}`,
          isFiller: e.isFiller || false,
        })),
        source: 'gogoanime-direct',
        animeId: best.id,
      });
    }

    return Response.json({
      episodes: info.episodes.map(e => ({
        id:     e.id,       // This is the GogoAnime episode ID
        number: e.number,
        title:  e.title || `Episode ${e.number}`,
        isFiller: e.isFiller || false,
      })),
      source: 'anilist-mapped',
      totalEpisodes: info.totalEpisodes,
    });

  } catch (err) {
    console.error('Episodes error:', err.message);
    return Response.json({ episodes: [], err: err.message });
  }
}
