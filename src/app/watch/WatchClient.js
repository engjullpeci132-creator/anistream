'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function WatchClient({
  anime, animeTitle, alId, initialEp, maxEps, initialCat, relations, recs,
}) {
  const [ep, setEp]           = useState(initialEp);
  const [cat, setCat]         = useState(initialCat);
  const [srv, setSrv]         = useState('gogocdn');
  const [state, setState]     = useState('idle'); // idle|loading|playing|error
  const [streamUrl, setUrl]   = useState('');
  const [subs, setSubs]       = useState([]);
  const [episodes, setEps]    = useState([]);
  const [epReady, setEpReady] = useState(false);
  const [log, setLog]         = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [descExp, setDescExp] = useState(false);
  const [range, setRange]     = useState(0);
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const fetchedRef = useRef(false);

  const title  = animeTitle || 'Anime';
  const cover  = anime?.coverImage?.extraLarge || anime?.coverImage?.large || '';
  const score  = anime?.averageScore ? (anime.averageScore/10).toFixed(1) : null;
  const desc   = (anime?.description||'').replace(/<[^>]*>/g,'');
  const genres = anime?.genres || [];
  const format = anime?.format || '';
  const status = (anime?.status||'').replace(/_/g,' ');
  const year   = anime?.seasonYear || '';
  const dur    = anime?.duration ? `${anime.duration} min/ep` : '';
  const showMax = maxEps || 100;

  // Episode ranges
  const ranges = [];
  for (let i=1; i<=showMax; i+=50) ranges.push([i, Math.min(i+49, showMax)]);

  const log1 = (m) => setLog(l => [...l.slice(-40), m]);

  // Fetch episode list once on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    log1(`Fetching episodes via Consumet (AniList ID: ${alId})`);
    setState('loading');
    fetch(`/api/episodes?id=${alId}&title=${encodeURIComponent(title)}`)
      .then(r => r.json())
      .then(d => {
        const count = d.episodes?.length || 0;
        log1(`Found ${count} episodes via ${d.source||'unknown'}${d.err?' | '+d.err:''}`);
        if (count > 0) {
          setEps(d.episodes);
          setEpReady(true);
        } else {
          setEpReady(false);
          setState('error');
        }
      })
      .catch(e => { log1(`Ep fetch failed: ${e.message}`); setState('error'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load stream when ep/cat/srv/epReady changes
  const loadStream = useCallback(() => {
    if (!epReady || episodes.length === 0) return;
    setState('loading');
    setUrl('');

    const obj = episodes.find(e => e.number === ep) || episodes[ep-1] || episodes[0];
    const epId = obj?.id || obj?.episodeId;
    if (!epId) { log1(`No episode ID for ep ${ep}`); setState('error'); return; }

    log1(`Stream: ep${ep} | GogoAnime | ${srv} | id:${epId}`);

    fetch(`/api/stream?episodeId=${encodeURIComponent(epId)}&server=${srv}`)
      .then(r => r.json())
      .then(d => {
        if (d.url) {
          log1(`✓ ${d.server}: ${d.url.slice(0,60)}…`);
          setUrl(d.url);
          setSubs(d.subtitles || []);
          setSrv(d.server);
          setState('playing');
          try {
            const u = new URL(window.location.href);
            u.searchParams.set('ep', ep); u.searchParams.set('cat', cat);
            window.history.replaceState({}, '', u.toString());
          } catch {}
        } else {
          log1(`✗ ${d.err||'no stream'}`);
          setState('error');
        }
      })
      .catch(e => { log1(`✗ ${e.message}`); setState('error'); });
  }, [ep, cat, srv, episodes, epReady]);

  useEffect(() => { if (epReady) loadStream(); }, [epReady, loadStream]);

  // HLS player init
  useEffect(() => {
    if (state !== 'playing' || !streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Cleanup
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
    while (video.firstChild) video.removeChild(video.firstChild);

    // Add subtitle tracks
    subs.forEach(s => {
      if (!s?.url || !s?.lang) return;
      const t = document.createElement('track');
      t.kind='subtitles'; t.label=s.lang; t.src=s.url;
      if (s.lang.toLowerCase().includes('english')) t.default=true;
      video.appendChild(t);
    });

    const setupHLS = (Hls) => {
      if (Hls.isSupported()) {
        const h = new Hls({ maxBufferLength:30, enableWorker:true });
        h.loadSource(streamUrl);
        h.attachMedia(video);
        h.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
        h.on(Hls.Events.ERROR, (_,d) => { if(d.fatal) log1(`HLS:${d.type}`); });
        hlsRef.current = h;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch(()=>{});
      }
    };

    if (streamUrl.includes('.m3u8')) {
      if (window.Hls) {
        setupHLS(window.Hls);
      } else {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js';
        s.onload = () => setupHLS(window.Hls);
        s.onerror = () => { video.src = streamUrl; video.play().catch(()=>{}); };
        document.head.appendChild(s);
      }
    } else {
      video.src = streamUrl;
      video.play().catch(()=>{});
    }

    return () => { if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; } };
  }, [streamUrl, state]);

  function goEp(n) {
    setEp(n);
    const ri = ranges.findIndex(([s,e]) => n>=s && n<=e);
    if (ri>=0) setRange(ri);
  }

  // Button styles
  const btnStyle = (on) => ({
    background: on?'var(--acc)':'var(--s2)',
    border: `1.5px solid ${on?'var(--acc)':'var(--b1)'}`,
    color: on?'#fff':'var(--mu2)',
    borderRadius:8, padding:'6px 13px', fontSize:'.79rem', fontWeight:600,
    cursor:'pointer', fontFamily:'inherit', transition:'all .18s',
  });
  const catStyle = (on) => ({
    background: on?'rgba(100,200,120,.14)':'var(--s2)',
    border: `1.5px solid ${on?'rgba(100,200,120,.3)':'var(--b1)'}`,
    color: on?'#6dc87a':'var(--mu2)',
    borderRadius:8, padding:'6px 13px', fontSize:'.79rem', fontWeight:600,
    cursor:'pointer', fontFamily:'inherit', transition:'all .18s',
  });

  const errMsg = !epReady
    ? 'Anime not found via Consumet/GogoAnime. Click Retry — first load can be slow.'
    : 'No stream found on any server. Try SUB ↔ DUB or click Retry.';

  return (
    <>
      {/* Breadcrumb */}
      <div style={{padding:'9px clamp(1rem,4vw,3rem)',fontSize:'.78rem',color:'var(--mu)',borderBottom:'1px solid var(--b0)',display:'flex',gap:5,flexWrap:'wrap',marginTop:'calc(var(--nav) + var(--gbar))'}}>
        <Link href="/" style={{color:'var(--mu2)'}}>Home</Link>
        <span>›</span>
        <span style={{color:'var(--mu2)'}}>{title}</span>
        <span>›</span>
        <span>Episode {ep}</span>
      </div>

      <div className="wl">

        {/* ── LEFT ── */}
        <div>

          {/* Video player */}
          <div style={{position:'relative',background:'#000',borderRadius:'var(--r)',overflow:'hidden',aspectRatio:'16/9',border:'1.5px solid var(--b0)'}}>

            {state==='playing' && (
              <video ref={videoRef} controls playsInline style={{width:'100%',height:'100%',display:'block',background:'#000'}}/>
            )}

            {(state==='loading'||state==='idle') && (
              <div style={{position:'absolute',inset:0,background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
                <div className="spinner"/>
                <span style={{color:'var(--mu)',fontSize:'.88rem'}}>
                  {!epReady ? 'Fetching from GogoAnime…' : 'Loading stream…'}
                </span>
              </div>
            )}

            {state==='error' && (
              <div style={{position:'absolute',inset:0,background:'rgba(7,9,15,.94)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,textAlign:'center',padding:'2rem'}}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
                <h3 style={{fontSize:'1.05rem',fontWeight:800}}>Stream unavailable</h3>
                <p style={{fontSize:'.84rem',color:'var(--mu2)',maxWidth:420,lineHeight:1.55}}>{errMsg}</p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginTop:4}}>
                  <button onClick={()=>setCat(c=>c==='sub'?'dub':'sub')} style={btnStyle(true)}>
                    Try {cat==='sub'?'DUB':'SUB'}
                  </button>
                  <button onClick={()=>{fetchedRef.current=false;setEpReady(false);setEps([]);setState('loading');fetch(`/api/episodes?id=${alId}&title=${encodeURIComponent(title)}`).then(r=>r.json()).then(d=>{if(d.episodes?.length){setEps(d.episodes);setEpReady(true);}else setState('error');}).catch(()=>setState('error'));}} style={btnStyle(false)}>
                    ↻ Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Log */}
          <button onClick={()=>setShowLog(v=>!v)} style={{background:'none',border:'none',color:'var(--mu)',fontSize:'.72rem',cursor:'pointer',fontFamily:'inherit',padding:'5px 0',display:'block'}}>
            [{showLog?'hide':'show'} stream log]
          </button>
          {showLog&&(
            <pre style={{background:'#000',border:'1px solid var(--b1)',borderRadius:8,padding:'10px 14px',fontFamily:'monospace',fontSize:'.73rem',color:'#4a9',lineHeight:1.65,overflowX:'auto',marginTop:4,whiteSpace:'pre-wrap',maxHeight:180}}>
              {log.join('\n')||'No logs yet.'}
            </pre>
          )}

          {/* Controls */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,paddingBottom:12,borderBottom:'1px solid var(--b0)',flexWrap:'wrap'}}>
            <span style={{fontSize:'.78rem',color:'var(--mu)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>Server:</span>
            {['gogocdn','streamsb','vidcdn'].map(s=>(
              <button key={s} onClick={()=>setSrv(s)} style={btnStyle(srv===s)}>{s.toUpperCase()}</button>
            ))}
            <button onClick={loadStream} style={btnStyle(false)}>↻ Retry</button>
            <div style={{display:'flex',gap:7,marginLeft:'auto'}}>
              <button onClick={()=>setCat('sub')} style={catStyle(cat==='sub')}>SUB</button>
              <button onClick={()=>setCat('dub')} style={catStyle(cat==='dub')}>DUB</button>
            </div>
          </div>

          {/* Anime info */}
          <div style={{display:'flex',gap:14,marginTop:16,alignItems:'flex-start'}}>
            {cover&&(
              <div style={{width:96,minWidth:96,aspectRatio:'2/3',borderRadius:9,overflow:'hidden',border:'1.5px solid var(--b1)',flexShrink:0}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              </div>
            )}
            <div>
              <div style={{fontWeight:900,fontSize:'1.2rem',lineHeight:1.15,marginBottom:7,letterSpacing:'-.3px'}}>{title}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {score&&<span className="badge b-gold">★ {score}/10</span>}
                {format&&<span className="badge b-purple">{format}</span>}
                {status&&<span className="badge b-green">{status}</span>}
                {year&&<span className="badge b-dim">{year}</span>}
                {dur&&<span className="badge b-dim">{dur}</span>}
              </div>
              {genres.length>0&&(
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                  {genres.slice(0,6).map(g=><Link key={g} href={`/?genre=${encodeURIComponent(g)}`} className="gtag">{g}</Link>)}
                </div>
              )}
              {desc&&(
                <>
                  <p style={{fontSize:'.83rem',color:'var(--mu2)',lineHeight:1.63,display:'-webkit-box',WebkitLineClamp:descExp?'unset':3,WebkitBoxOrient:'vertical',overflow:descExp?'visible':'hidden'}}>
                    {desc}
                  </p>
                  <button onClick={()=>setDescExp(v=>!v)} style={{background:'none',border:'none',color:'var(--acc)',fontSize:'.78rem',cursor:'pointer',padding:'4px 0',fontFamily:'inherit',fontWeight:600}}>
                    {descExp?'Show less ▴':'Show more ▾'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Episode selector */}
          <div style={{marginTop:22}}>
            <h3 style={{fontWeight:800,fontSize:'.82rem',color:'var(--mu2)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:9}}>
              Episodes {maxEps?`(${maxEps} total)`:''}
              {state==='loading'&&!epReady&&<span style={{color:'var(--mu)',fontWeight:400,marginLeft:8}}>searching…</span>}
            </h3>
            {ranges.length>1&&(
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:9}}>
                {ranges.map(([s,e],ri)=>(
                  <button key={ri} onClick={()=>setRange(ri)} style={{
                    background:'var(--s2)',border:`1.5px solid ${range===ri?'var(--acc)':'var(--b1)'}`,
                    color:range===ri?'var(--acc)':'var(--mu2)',
                    borderRadius:8,padding:'5px 12px',fontSize:'.76rem',fontWeight:700,
                    cursor:'pointer',fontFamily:'inherit',
                  }}>{s}–{e}</button>
                ))}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(48px,1fr))',gap:5,maxHeight:228,overflowY:'auto'}}>
              {Array.from({length:(ranges[range]?.[1]||1)-(ranges[range]?.[0]||1)+1},(_,i)=>{
                const n=(ranges[range]?.[0]||1)+i;
                return (
                  <button key={n} onClick={()=>goEp(n)} style={{
                    background:ep===n?'var(--acc)':'var(--s2)',
                    border:`1.5px solid ${ep===n?'var(--acc)':'var(--b0)'}`,
                    color:ep===n?'#fff':'var(--mu2)',
                    borderRadius:8,padding:'8px 3px',textAlign:'center',
                    fontSize:'.76rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                  }}>{n}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside>
          {ep<showMax&&(
            <button onClick={()=>goEp(ep+1)} style={{
              background:'var(--s2)',border:'1.5px solid var(--b1)',borderRadius:'var(--r)',
              padding:12,display:'block',width:'100%',textAlign:'left',cursor:'pointer',
              marginBottom:18,fontFamily:'inherit',
            }}>
              <div style={{fontSize:'.7rem',color:'var(--mu)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Up Next</div>
              <div style={{fontSize:'.9rem',fontWeight:700,marginBottom:3}}>{title}</div>
              <div style={{fontSize:'.82rem',color:'var(--acc)',fontWeight:700}}>▶ Episode {ep+1}</div>
            </button>
          )}

          {relations.length>0&&(
            <div style={{marginBottom:22}}>
              <div style={{fontWeight:800,fontSize:'.77rem',color:'var(--mu)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:9}}>Related</div>
              {relations.map(e=>{
                const n=e.node; const rt=n.title?.english||n.title?.romaji||'';
                return (
                  <Link key={n.id} href={`/watch?id=${n.id}&ep=1&title=${encodeURIComponent(rt)}&eps=${n.episodes||0}`}
                    style={{display:'flex',gap:9,padding:8,borderRadius:9,marginBottom:5,textDecoration:'none',color:'inherit'}}>
                    <div style={{width:55,minWidth:55,aspectRatio:'2/3',borderRadius:7,overflow:'hidden',flexShrink:0}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.coverImage?.large||''} alt={rt} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                    </div>
                    <div>
                      <div style={{fontSize:'.66rem',color:'var(--acc)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:2}}>{e.relationType}</div>
                      <div style={{fontSize:'.81rem',fontWeight:700,lineHeight:1.32,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{rt}</div>
                      <div style={{fontSize:'.7rem',color:'var(--mu)'}}>{n.episodes?`${n.episodes} eps`:'Ongoing'}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {recs.length>0&&(
            <div>
              <div style={{fontWeight:800,fontSize:'.77rem',color:'var(--mu)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:9}}>You May Also Like</div>
              {recs.map(r=>{
                if(!r) return null;
                const rt=r.title?.english||r.title?.romaji||'';
                const rs=r.averageScore?(r.averageScore/10).toFixed(1):null;
                return (
                  <Link key={r.id} href={`/watch?id=${r.id}&ep=1&title=${encodeURIComponent(rt)}&eps=${r.episodes||0}`}
                    style={{display:'flex',gap:9,padding:8,borderRadius:9,marginBottom:5,textDecoration:'none',color:'inherit'}}>
                    <div style={{width:55,minWidth:55,aspectRatio:'2/3',borderRadius:7,overflow:'hidden',flexShrink:0}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.coverImage?.large||''} alt={rt} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                    </div>
                    <div>
                      {rs&&<div style={{fontSize:'.7rem',color:'var(--gold)',fontWeight:700}}>★ {rs}/10</div>}
                      <div style={{fontSize:'.81rem',fontWeight:700,lineHeight:1.32,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{rt}</div>
                      <div style={{fontSize:'.7rem',color:'var(--mu)'}}>{r.format||''} · {r.episodes?`${r.episodes} eps`:'Ongoing'}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .wl{display:grid;grid-template-columns:1fr 318px;gap:20px;padding:20px clamp(1rem,4vw,3rem);max-width:1500px;margin:0 auto}
        @media(max-width:1000px){.wl{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
