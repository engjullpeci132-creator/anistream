// GET /api/stream?episodeId={gogoEpisodeId}&server=gogocdn
// Uses @consumet/extensions to get HLS m3u8 stream from GogoAnime
// Runs in-process on Vercel — no cold starts, no sleeping instances

import { ANIME } from '@consumet/extensions';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get('episodeId') || '';
  const server    = searchParams.get('server')    || 'gogocdn';

  if (!episodeId) {
    return Response.json({ url: null, err: 'episodeId required' });
  }

  try {
    const gogo = new ANIME.Gogoanime();

    // GogoAnime servers: gogocdn (default, best), streamsb, streamwish, vidcdn
    const streamingServers = ['gogocdn', 'streamsb', 'vidcdn', 'streamwish'];
    const order = [server, ...streamingServers.filter(s => s !== server)];

    for (const srv of order) {
      try {
        const sources = await gogo.fetchEpisodeSources(episodeId, srv);

        if (!sources || !sources.sources || sources.sources.length === 0) continue;

        // Find best quality — prefer m3u8, then highest quality
        const m3u8Sources = sources.sources.filter(s => s.isM3U8 || s.url?.includes('.m3u8'));
        const best = m3u8Sources.find(s => s.quality === '1080p')
          || m3u8Sources.find(s => s.quality === '720p')
          || m3u8Sources.find(s => s.quality === 'default')
          || m3u8Sources[0]
          || sources.sources[0];

        if (!best?.url) continue;

        return Response.json({
          url:       best.url,
          isM3U8:    best.isM3U8 ?? best.url.includes('.m3u8'),
          quality:   best.quality || 'auto',
          allSources: sources.sources.map(s => ({ url: s.url, quality: s.quality, isM3U8: s.isM3U8 })),
          subtitles: sources.subtitles || [],
          headers:   sources.headers   || {},
          server:    srv,
        });

      } catch (srvErr) {
        console.warn(`Server ${srv} failed:`, srvErr.message);
        continue;
      }
    }

    return Response.json({ url: null, err: 'No stream found on any GogoAnime server' });

  } catch (err) {
    console.error('Stream error:', err.message);
    return Response.json({ url: null, err: err.message });
  }
}
