'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function WatchClient({
  anime, animeTitle, alId, initialEp, maxEps, initialCat, relations, recs,
}) {
  const [ep, setEp]         = useState(initialEp);
  const [cat, setCat]       = useState(initialCat);
  const [srv, setSrv]       = useState('hd-1');
  const [playerState, setPlayerState] = useState('loading'); // loading | playing | error
  const [streamUrl, setStreamUrl]     = useState(null);
  const [subtitles, setSubtitles]     = useState([]);
  const [episodes, setEpisodes]       = useState([]);
  const [epStatus, setEpStatus]       = useState('fetching'); // fetching | ready | failed
  const [log, setLog]       = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [descExp, setDescExp] = useState(false);
  const [activeRange, setActiveRange] = useState(0);
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);
  const loadedRef = useRef(false);

  const title  = animeTitle;
  const cover  = anime?.coverImage?.extraLarge || anime?.coverImage?.large || '';
  const score  = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const desc   = (anime?.description || '').replace(/<[^>]*>/g, '');
  const genres = anime?.genres || [];
  const format = anime?.format || '';
  const status = (anime?.status || '').replace(/_/g, ' ');
  const year   = anime?.seasonYear || '';
  const dur    = anime?.duration ? `${anime.duration} min/ep` : '';
  const showMax = maxEps || 100;

  // Build ranges (50 eps each)
  const ranges = [];
  for (let i = 1; i <= showMax; i += 50) ranges.push([i, Math.min(i + 49, showMax)]);

  const addLog = (msg) => setLog(l => [...l.slice(-50), msg]);

  // Fetch episode list once
  useEffect(() => {
    if (!title || loadedRef.current) return;
    loadedRef.current = true;
    addLog(`Searching HiAnime: "${title}"`);
    fetch(`/api/episodes?title=${encodeURIComponent(title)}`)
      .then(r => r.json())
      .then(d => {
        addLog(`Episodes: ${d.episodes?.length || 0} found | HiAnime ID: ${d.hid || 'none'}${d.err ? ' | err: ' + d.err : ''}`);
        setEpisodes(d.episodes || []);
        setEpStatus(d.episodes?.length ? 'ready' : 'failed');
      })
      .catch(e => { addLog(`Episode fetch failed: ${e.message}`); setEpStatus('failed'); });
  }, [title]);

  // Load stream when ep/cat/srv/epStatus changes
  const loadStream = useCallback(async () => {
    if (epStatus === 'fetching') return;
    setPlayerState('loading');
    setStreamUrl(null);

    if (epStatus === 'failed' || episodes.length === 0) {
      setPlayerState('error');
      return;
    }

    const obj = episodes.find(e => e.number === ep) || episodes[ep - 1] || episodes[0];
    if (!obj) { setPlayerState('error'); return; }

    addLog(`Stream: ep${ep} | ${cat.toUpperCase()} | server: ${srv} | id: ${obj.episodeId}`);

    try {
      const r = await fetch(`/api/stream?episodeId=${encodeURIComponent(obj.episodeId)}&category=${cat}&server=${srv}`);
      const d = await r.json();

      if (d.url) {
        addLog(`✓ ${d.server}: ${d.url.slice(0, 70)}…`);
        setStreamUrl(d.url);
        setSubtitles(d.subtitles || []);
        setSrv(d.server);
        setPlayerState('playing');
        // Update URL silently
        const u = new URL(window.location.href);
        u.searchParams.set('ep', ep); u.searchParams.set('cat', cat);
        window.history.replaceState({}, '', u.toString());
      } else {
        addLog(`✗ ${d.err || 'no stream'}`);
        setPlayerState('error');
      }
    } catch (e) {
      addLog(`✗ ${e.message}`);
      setPlayerState('error');
    }
  }, [ep, cat, srv, episodes, epStatus]);

  useEffect(() => { loadStream(); }, [loadStream]);

  // Init HLS.js
  useEffect(() => {
    if (playerState !== 'playing' || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    while (video.firstChild) video.removeChild(video.firstChild);

    subtitles.forEach(s => {
      if (!s?.url || !s?.lang) return;
      const t = document.createElement('track');
      t.kind = 'subtitles'; t.label = s.lang; t.src = s.url;
      if (s.lang.toLowerCase().includes('english')) t.default = true;
      video.appendChild(t);
    });

    const isHLS = streamUrl.includes('.m3u8');

    if (isHLS && typeof window !== 'undefined') {
      // Dynamically load HLS.js
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
      script.onload = () => {
        const Hls = window.Hls;
        if (Hls && Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) addLog(`HLS error: ${d.type}`); });
          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.play().catch(() => {});
        }
      };
      document.head.appendChild(script);
    } else {
      video.src = streamUrl;
      video.play().catch(() => {});
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [streamUrl, playerState]);

  function goEp(n) {
    setEp(n);
    const ri = ranges.findIndex(([s, e]) => n >= s && n <= e);
    if (ri >= 0) setActiveRange(ri);
  }

  const wurl = (e, c) =>
    `/watch?id=${alId}&ep=${e}&title=${encodeURIComponent(title)}&eps=${maxEps}&cat=${c}`;

  // ── Error message ──
  let errMsg = 'No stream found. Try switching SUB ↔ DUB or click Retry.';
  if (epStatus === 'failed')
    errMsg = 'Could not find this anime on HiAnime. The aniwatch-api may be sleeping — wait 30 seconds and click Retry.';

  // ── Styles ──
  const btn = (active) => ({
    background: active ? 'var(--acc)' : 'var(--s2)',
    border: `1.5px solid ${active ? 'var(--acc)' : 'var(--b1)'}`,
    color: active ? '#fff' : 'var(--mu2)',
    borderRadius: 8, padding: '6px 13px', fontSize: '.79rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s',
  });

  const catBtn = (active) => ({
    background: active ? 'rgba(100,200,120,.14)' : 'var(--s2)',
    border: `1.5px solid ${active ? 'rgba(100,200,120,.3)' : 'var(--b1)'}`,
    color: active ? '#6dc87a' : 'var(--mu2)',
    borderRadius: 8, padding: '6px 13px', fontSize: '.79rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s',
  });

  return (
    <>
      {/* Breadcrumb */}
      <div style={{
        padding: '9px clamp(1rem,4vw,3rem)', fontSize: '.78rem', color: 'var(--mu)',
        borderBottom: '1px solid var(--b0)', display: 'flex', gap: 5, flexWrap: 'wrap',
        marginTop: 'calc(var(--nav) + var(--gbar))',
      }}>
        <Link href="/" style={{ color: 'var(--mu2)' }}>Home</Link>
        <span>›</span><span style={{ color: 'var(--mu2)' }}>{title}</span>
        <span>›</span><span>Episode {ep}</span>
      </div>

      <div className="watch-layout">

        {/* ─── LEFT ─── */}
        <div>

          {/* Player */}
          <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--r)', overflow: 'hidden', aspectRatio: '16/9', border: '1.5px solid var(--b0)' }}>
            {playerState === 'playing' && (
              <video ref={videoRef} controls playsInline style={{ width: '100%', height: '100%', display: 'block', background: '#000' }} />
            )}
            {playerState === 'loading' && (
              <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <div className="spinner" />
                <span style={{ color: 'var(--mu)', fontSize: '.88rem' }}>
                  {epStatus === 'fetching' ? 'Finding on HiAnime…' : 'Loading stream…'}
                </span>
              </div>
            )}
            {playerState === 'error' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,9,15,.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '2rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Stream unavailable</h3>
                <p style={{ fontSize: '.84rem', color: 'var(--mu2)', maxWidth: 420, lineHeight: 1.55 }}>{errMsg}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                  <button onClick={() => setCat(cat === 'sub' ? 'dub' : 'sub')} style={{ ...btn(true) }}>
                    Try {cat === 'sub' ? 'DUB' : 'SUB'}
                  </button>
                  <button onClick={loadStream} style={{ ...btn(false) }}>↻ Retry</button>
                </div>
              </div>
            )}
          </div>

          {/* Debug log */}
          <button onClick={() => setShowLog(!showLog)}
            style={{ background: 'none', border: 'none', color: 'var(--mu)', fontSize: '.72rem', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 0', display: 'block' }}>
            [{showLog ? 'hide' : 'show'} stream log]
          </button>
          {showLog && (
            <pre style={{ background: '#000', border: '1px solid var(--b1)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: '.73rem', color: '#4a9', lineHeight: 1.65, overflowX: 'auto', marginTop: 4, whiteSpace: 'pre-wrap', maxHeight: 200 }}>
              {log.join('\n') || 'No logs yet.'}
            </pre>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingBottom: 12, borderBottom: '1px solid var(--b0)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Server:</span>
            {['hd-1', 'hd-2', 'streamtape'].map(s => (
              <button key={s} onClick={() => setSrv(s)} style={btn(srv === s)}>{s.toUpperCase()}</button>
            ))}
            <button onClick={loadStream} style={btn(false)}>↻ Retry</button>
            <div style={{ display: 'flex', gap: 7, marginLeft: 'auto' }}>
              <button onClick={() => setCat('sub')} style={catBtn(cat === 'sub')}>SUB</button>
              <button onClick={() => setCat('dub')} style={catBtn(cat === 'dub')}>DUB</button>
            </div>
          </div>

          {/* Anime info */}
          <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'flex-start' }}>
            {cover && (
              <div style={{ width: 96, minWidth: 96, aspectRatio: '2/3', borderRadius: 9, overflow: 'hidden', border: '1.5px solid var(--b1)', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1.15, marginBottom: 7, letterSpacing: '-.3px' }}>{title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {score  && <span className="badge b-gold">★ {score}/10</span>}
                {format && <span className="badge b-purple">{format}</span>}
                {status && <span className="badge b-green">{status}</span>}
                {year   && <span className="badge b-dim">{year}</span>}
                {dur    && <span className="badge b-dim">{dur}</span>}
              </div>
              {genres.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {genres.slice(0, 6).map(g => <Link key={g} href={`/?genre=${encodeURIComponent(g)}`} className="gtag">{g}</Link>)}
                </div>
              )}
              {desc && (
                <>
                  <p style={{ fontSize: '.83rem', color: 'var(--mu2)', lineHeight: 1.63, display: '-webkit-box', WebkitLineClamp: descExp ? 'unset' : 3, WebkitBoxOrient: 'vertical', overflow: descExp ? 'visible' : 'hidden' }}>
                    {desc}
                  </p>
                  <button onClick={() => setDescExp(!descExp)}
                    style={{ background: 'none', border: 'none', color: 'var(--acc)', fontSize: '.78rem', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit', fontWeight: 600 }}>
                    {descExp ? 'Show less ▴' : 'Show more ▾'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Episode selector */}
          <div style={{ marginTop: 22 }}>
            <h3 style={{ fontWeight: 800, fontSize: '.82rem', color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 9 }}>
              Episodes {maxEps ? `(${maxEps} total)` : ''}
              {epStatus === 'fetching' && <span style={{ color: 'var(--mu)', fontWeight: 400, marginLeft: 8 }}>searching…</span>}
            </h3>
            {ranges.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
                {ranges.map(([s, e], ri) => (
                  <button key={ri} onClick={() => setActiveRange(ri)}
                    style={{
                      background: 'var(--s2)',
                      border: `1.5px solid ${activeRange === ri ? 'var(--acc)' : 'var(--b1)'}`,
                      color: activeRange === ri ? 'var(--acc)' : 'var(--mu2)',
                      borderRadius: 8, padding: '5px 12px', fontSize: '.76rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {s}–{e}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(48px,1fr))', gap: 5, maxHeight: 228, overflowY: 'auto' }}>
              {Array.from({ length: (ranges[activeRange]?.[1] || 1) - (ranges[activeRange]?.[0] || 1) + 1 }, (_, i) => {
                const n = (ranges[activeRange]?.[0] || 1) + i;
                return (
                  <button key={n} onClick={() => goEp(n)}
                    style={{
                      background: ep === n ? 'var(--acc)' : 'var(--s2)',
                      border: `1.5px solid ${ep === n ? 'var(--acc)' : 'var(--b0)'}`,
                      color: ep === n ? '#fff' : 'var(--mu2)',
                      borderRadius: 8, padding: '8px 3px', textAlign: 'center',
                      fontSize: '.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── SIDEBAR ─── */}
        <aside>
          {ep < showMax && (
            <button onClick={() => goEp(ep + 1)} style={{
              background: 'var(--s2)', border: '1.5px solid var(--b1)', borderRadius: 'var(--r)',
              padding: 12, display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
              marginBottom: 18, fontFamily: 'inherit',
            }}>
              <div style={{ fontSize: '.7rem', color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Up Next</div>
              <div style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--acc)', fontWeight: 700 }}>▶ Episode {ep + 1}</div>
            </button>
          )}

          {relations.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 800, fontSize: '.77rem', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 9 }}>Related</div>
              {relations.map(e => {
                const n = e.node;
                const rt = n.title?.english || n.title?.romaji || '';
                return (
                  <Link key={n.id}
                    href={`/watch?id=${n.id}&ep=1&title=${encodeURIComponent(rt)}&eps=${n.episodes || 0}`}
                    style={{ display: 'flex', gap: 9, padding: 8, borderRadius: 9, marginBottom: 5 }}>
                    <div style={{ width: 55, minWidth: 55, aspectRatio: '2/3', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.coverImage?.large || ''} alt={rt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '.66rem', color: 'var(--acc)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{e.relationType}</div>
                      <div style={{ fontSize: '.81rem', fontWeight: 700, lineHeight: 1.32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rt}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--mu)' }}>{n.episodes ? `${n.episodes} eps` : 'Ongoing'}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {recs.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '.77rem', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 9 }}>You May Also Like</div>
              {recs.map(r => {
                if (!r) return null;
                const rt = r.title?.english || r.title?.romaji || '';
                const rs = r.averageScore ? (r.averageScore / 10).toFixed(1) : null;
                return (
                  <Link key={r.id}
                    href={`/watch?id=${r.id}&ep=1&title=${encodeURIComponent(rt)}&eps=${r.episodes || 0}`}
                    style={{ display: 'flex', gap: 9, padding: 8, borderRadius: 9, marginBottom: 5 }}>
                    <div style={{ width: 55, minWidth: 55, aspectRatio: '2/3', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.coverImage?.large || ''} alt={rt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div>
                      {rs && <div style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 700 }}>★ {rs}/10</div>}
                      <div style={{ fontSize: '.81rem', fontWeight: 700, lineHeight: 1.32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rt}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--mu)' }}>{r.format || ''} · {r.episodes ? `${r.episodes} eps` : 'Ongoing'}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .watch-layout {
          display: grid;
          grid-template-columns: 1fr 318px;
          gap: 20px;
          padding: 20px clamp(1rem,4vw,3rem);
          max-width: 1500px;
          margin: 0 auto;
        }
        @media(max-width: 1000px) { .watch-layout { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
