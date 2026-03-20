'use client';
import { useState } from 'react';

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror','Isekai',
  'Mecha','Mystery','Psychological','Romance','Sci-Fi','Seinen','Shounen',
  'Slice of Life','Sports','Supernatural','Thriller',
];

export default function Navbar() {
  const [q, setQ] = useState('');

  return (
    <>
      <nav style={{
        position:'fixed',inset:'0 0 auto 0',zIndex:500,height:'var(--nav)',
        display:'flex',alignItems:'center',gap:'2rem',
        padding:'0 clamp(1rem,4vw,3rem)',
        background:'rgba(7,9,15,.97)',backdropFilter:'blur(22px)',
        borderBottom:'1px solid var(--b0)',
      }}>
        <a href="/" style={{fontWeight:900,fontSize:'1.5rem',letterSpacing:'-.7px',whiteSpace:'nowrap'}}>
          Ani<em style={{color:'var(--acc)',fontStyle:'normal'}}>Stream</em>
        </a>
        <ul style={{display:'flex',gap:'1.5rem',listStyle:'none',flex:1,overflow:'hidden'}} className="nl">
          {['Action','Isekai','Romance','Fantasy','Shounen'].map(g=>(
            <li key={g}><a href={`/?genre=${g}`} style={{color:'var(--mu2)',fontSize:'.87rem',fontWeight:500}}>{g}</a></li>
          ))}
        </ul>
        <form
          onSubmit={e=>{e.preventDefault();if(q.trim())window.location.href=`/?q=${encodeURIComponent(q.trim())}`;}}
          style={{display:'flex',gap:6,marginLeft:'auto',alignItems:'center',flexShrink:0}}
        >
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search anime…"
            className="si"
          />
          <button type="submit" className="sb">Search</button>
        </form>
      </nav>

      <div style={{
        position:'sticky',top:'var(--nav)',zIndex:400,height:'var(--gbar)',
        display:'flex',alignItems:'center',gap:6,overflowX:'auto',
        padding:'0 clamp(1rem,4vw,3rem)',
        background:'rgba(7,9,15,.95)',backdropFilter:'blur(16px)',
        borderBottom:'1px solid var(--b0)',scrollbarWidth:'none',
      }}>
        <a href="/" className="gp">🏠 All</a>
        {GENRES.map(g=>(
          <a key={g} href={`/?genre=${encodeURIComponent(g)}`} className="gp">{g}</a>
        ))}
      </div>

      <style>{`
        .nl{display:none!important}
        @media(min-width:860px){.nl{display:flex!important}}
        .nl a:hover{color:var(--txt)!important}
        .gp{background:var(--s2);border:1.5px solid var(--b1);color:var(--mu2);border-radius:20px;padding:4px 15px;font-size:.8rem;font-weight:600;transition:all .18s;white-space:nowrap;flex-shrink:0;text-decoration:none;}
        .gp:hover{background:var(--acc);border-color:var(--acc);color:#fff}
        .si{background:var(--s2);border:1.5px solid var(--b1);border-radius:9px;padding:8px 15px;color:var(--txt);font-family:inherit;font-size:.87rem;width:200px;outline:none;transition:border-color .25s,width .3s;}
        .si:focus{border-color:var(--acc);width:260px}
        .si::placeholder{color:var(--mu)}
        .sb{background:var(--acc);border:none;border-radius:9px;color:#fff;padding:8px 18px;font-size:.87rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;}
        @media(max-width:600px){.si{width:120px!important}.si:focus{width:160px!important}}
      `}</style>
    </>
  );
}
