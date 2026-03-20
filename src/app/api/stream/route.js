const BASE = process.env.ANIWATCH_API || 'https://api-aniwatch.onrender.com';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get('episodeId') || '';
  const category  = searchParams.get('category')  || 'sub';
  const server    = searchParams.get('server')     || 'hd-1';

  if (!episodeId) return Response.json({ url: null, err: 'missing episodeId' });

  const servers = server === 'hd-1'
    ? ['hd-1', 'hd-2', 'streamtape']
    : [server, 'hd-1', 'hd-2', 'streamtape'];

  for (const srv of servers) {
    try {
      const url = `${BASE}/api/v2/hianime/episode/sources?animeEpisodeId=${encodeURIComponent(episodeId)}&server=${srv}&category=${category}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;

      const data = await res.json();
      const sources = data?.data?.sources || [];

      for (const src of sources) {
        if (src?.url) {
          return Response.json({
            url:       src.url,
            isM3U8:    src.url.includes('.m3u8'),
            quality:   src.quality || 'auto',
            subtitles: data?.data?.subtitles || [],
            server:    srv,
          });
        }
      }
    } catch { continue; }
  }

  return Response.json({ url: null, err: 'no stream found on any server' });
}
