import Link from 'next/link';
import NavbarWrapper from '../components/NavbarWrapper';
import AnimeCard from '../components/AnimeCard';
import { getTrending, searchAnime, getByGenre, getTitle, getCover, getScore } from '../lib/anilist';

export const revalidate = 300;

export default async function HomePage({ searchParams }) {
  // Safely resolve searchParams (Promise in Next 15)
  const sp = await Promise.resolve(searchParams);
  const q     = String(sp?.q     || '');
  const genre = String(sp?.genre || '');
  const page  = Math.max(1, parseInt(sp?.page || '1', 10) || 1);

  let trending = [];
  let airing   = [];
  let results  = [];
  let hasNext  = false;

  if (q) {
    const d = await searchAnime(q, page);
    results = d.results;
    hasNext = d.hasNext;
  } else if (genre) {
    const d = await getByGenre(genre, page);
    results = d.results;
    hasNext = d.hasNext;
  } else {
    const d = await getTrending(page);
    trending = d.trending;
    airing   = d.airing;
    hasNext  = d.hasNext;
  }

  const hero = trending[0] ?? null;

  return (
    <>
      <NavbarWrapper />

      {/* HERO */}
      {!q && !genre && hero && (
        <section style={{
          position:'relative',height:'88vh',minHeight:560,
          display:'flex',alignItems:'flex-end',overflow:'hidden',
          marginTop:'calc(var(--nav) + var(--gbar))',
        }}>
          <div style={{position:'absolute',inset:0,overflow:'hidden'}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.bannerImage || getCover(hero)}
              alt=""
              style={{width:'100%',height:'100%',objectFit:'cover',opacity:.3,filter:'blur(1px)'}}
            />
          </div>
          <div style={{
            position:'absolute',inset:0,
            background:'linear-gradient(to top,var(--bg) 0%,rgba(7,9,15,.72) 40%,transparent 100%),linear-gradient(to right,rgba(7,9,15,.96) 0%,rgba(7,9,15,.45) 28%,transparent 62%)',
          }}/>
          <div style={{position:'relative',padding:'0 clamp(1rem,5vw,4.5rem) clamp(2rem,4vh,4rem)',maxWidth:660}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(230,57,80,.1)',border:'1.5px solid rgba(230,57,80,.22)',color:'var(--acc2)',borderRadius:20,padding:'5px 13px',fontSize:'.72rem',fontWeight:700,letterSpacing:'.9px',textTransform:'uppercase',marginBottom:'1rem'}}>
              🔥 Trending #1
            </div>
            <h1 style={{fontWeight:900,fontSize:'clamp(1.9rem,4.5vw,3.6rem)',lineHeight:1.06,marginBottom:'.85rem',letterSpacing:'-.4px'}}>
              {getTitle(hero)}
            </h1>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'.85rem',flexWrap:'wrap'}}>
              {getScore(hero) && <span style={{background:'var(--goldd)',border:'1.5px solid rgba(245,197,24,.22)',color:'var(--gold)',borderRadius:7,padding:'3px 9px',fontSize:'.78rem',fontWeight:700}}>★ {getScore(hero)}/10</span>}
              {hero.seasonYear && <span style={{fontSize:'.82rem',color:'var(--mu2)'}}>{hero.seasonYear}</span>}
              {hero.format && <span style={{background:'rgba(120,80,255,.1)',border:'1.5px solid rgba(120,80,255,.2)',color:'#a080ff',borderRadius:7,padding:'3px 9px',fontSize:'.78rem',fontWeight:600}}>{hero.format}</span>}
              {hero.episodes && <span style={{fontSize:'.82rem',color:'var(--mu2)'}}>{hero.episodes} eps</span>}
            </div>
            {hero.description && (
              <p style={{color:'rgba(136,152,174,.82)',fontSize:'.91rem',lineHeight:1.67,marginBottom:'1.5rem',maxWidth:520,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                {hero.description.replace(/<[^>]*>/g,'').slice(0,300)}
              </p>
            )}
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Link
                href={`/watch?id=${hero.id}&ep=1&title=${encodeURIComponent(getTitle(hero))}&eps=${hero.episodes||0}`}
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--acc)',color:'#fff',borderRadius:10,padding:'12px 28px',fontWeight:700,fontSize:'.94rem'}}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Watch Now
              </Link>
              <a href="#main" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.08)',color:'var(--txt)',borderRadius:10,padding:'12px 26px',fontWeight:500,fontSize:'.91rem',border:'1.5px solid var(--b1)'}}>
                Browse All ↓
              </a>
            </div>
          </div>
        </section>
      )}

      <main id="main">

        {/* SEARCH RESULTS */}
        {q && (
          <section className="section" style={{paddingTop:'calc(var(--nav) + var(--gbar) + 2.5rem)'}}>
            <div className="sh">
              <span className="sh-dot"/><h2>Results for &ldquo;{q}&rdquo;</h2>
              <div className="sh-nav"><a href="/">← Clear</a></div>
            </div>
            {results.length === 0
              ? <p style={{color:'var(--mu2)',padding:'3rem 0'}}>No results found.</p>
              : <>
                  <div className="anime-grid">{results.map(a=><AnimeCard key={a.id} anime={a}/>)}</div>
                  <div className="pag">
                    {page>1&&<a href={`/?q=${encodeURIComponent(q)}&page=${page-1}`}>← Prev</a>}
                    <span className="cur">Page {page}</span>
                    {hasNext&&<a href={`/?q=${encodeURIComponent(q)}&page=${page+1}`}>Next →</a>}
                  </div>
                </>
            }
          </section>
        )}

        {/* GENRE */}
        {genre && !q && (
          <section className="section" style={{paddingTop:'calc(var(--nav) + var(--gbar) + 2.5rem)'}}>
            <div className="sh">
              <span className="sh-dot"/><h2>{genre} Anime</h2>
              <div className="sh-nav"><a href="/">← Home</a></div>
            </div>
            {results.length === 0
              ? <p style={{color:'var(--mu2)',padding:'3rem 0'}}>No results found.</p>
              : <>
                  <div className="anime-grid">{results.map(a=><AnimeCard key={a.id} anime={a}/>)}</div>
                  <div className="pag">
                    {page>1&&<a href={`/?genre=${encodeURIComponent(genre)}&page=${page-1}`}>← Prev</a>}
                    <span className="cur">Page {page}</span>
                    {hasNext&&<a href={`/?genre=${encodeURIComponent(genre)}&page=${page+1}`}>Next →</a>}
                  </div>
                </>
            }
          </section>
        )}

        {/* HOME */}
        {!q && !genre && (
          <>
            {airing.length > 0 && (
              <section className="section">
                <div className="sh"><span className="sh-dot"/><h2>Currently Airing</h2></div>
                <div className="airing-grid">
                  {airing.map(a=>{
                    const t=getTitle(a);
                    return (
                      <Link key={a.id} href={`/watch?id=${a.id}&ep=1&title=${encodeURIComponent(t)}&eps=${a.episodes||0}`} className="airing-card">
                        <div className="airing-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getCover(a)} alt={t} loading="lazy"/>
                        </div>
                        <div>
                          <div className="airing-title">{t}</div>
                          {a.averageScore&&<div className="airing-score">★ {(a.averageScore/10).toFixed(1)}/10</div>}
                          <div className="airing-ep">{a.episodes?`${a.episodes} eps`:'Ongoing'}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="section">
              <div className="sh">
                <span className="sh-dot"/><h2>Trending Now</h2>
                <div className="sh-nav">
                  {page>1&&<a href={`/?page=${page-1}`}>← Prev</a>}
                  {hasNext&&<a href={`/?page=${page+1}`}>Next →</a>}
                </div>
              </div>
              {trending.length === 0
                ? <p style={{color:'var(--mu2)',padding:'2rem 0'}}>Loading anime data…</p>
                : <div className="anime-grid">{trending.map(a=><AnimeCard key={a.id} anime={a}/>)}</div>
              }
              <div className="pag">
                {page>1&&<a href={`/?page=${page-1}`}>← Prev</a>}
                <span className="cur">Page {page}</span>
                {hasNext&&<a href={`/?page=${page+1}`}>Next →</a>}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div>
          <div style={{fontWeight:900,fontSize:'1.2rem',letterSpacing:'-.6px'}}>
            Ani<em style={{color:'var(--acc)',fontStyle:'normal'}}>Stream</em>
          </div>
          <p>Free anime streaming. Powered by AniList. Streams via aniwatch-api.</p>
        </div>
        <div>
          <h4>Genres</h4>
          {['Action','Romance','Isekai','Horror','Fantasy'].map(g=><a key={g} href={`/?genre=${g}`}>{g}</a>)}
        </div>
        <div>
          <h4>Browse</h4>
          {['Sci-Fi','Mecha','Sports','Psychological','Thriller'].map(g=><a key={g} href={`/?genre=${g}`}>{g}</a>)}
        </div>
        <div>
          <h4>Legal</h4>
          <a href="#">DMCA</a><a href="#">Privacy</a><a href="#">Terms</a>
        </div>
        <div className="footer-bottom">
          AniStream does not store any media. Streams via aniwatch-api. Data from AniList.
        </div>
      </footer>
    </>
  );
}
