'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const GENRES = [
  'Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Horror','Isekai',
  'Mecha','Mystery','Psychological','Romance','Sci-Fi','Seinen','Shounen',
  'Slice of Life','Sports','Supernatural','Thriller',
];

export default function Navbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp?.get('q') || '');
  const activeGenre = sp?.get('genre') || '';

  function handleSearch(e) {
    e.preventDefault();
    if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`);
    else router.push('/');
  }

  return (
    <>
      {/* Top nav */}
      <nav style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 500, height: 'var(--nav)',
        display: 'flex', alignItems: 'center', gap: '2rem',
        padding: '0 clamp(1rem,4vw,3rem)',
        background: 'rgba(7,9,15,.97)', backdropFilter: 'blur(22px)',
        borderBottom: '1px solid var(--b0)',
      }}>
        <a href="/" style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-.7px', whiteSpace: 'nowrap' }}>
          Ani<em style={{ color: 'var(--acc)', fontStyle: 'normal' }}>Stream</em>
        </a>
        <ul style={{ display: 'flex', gap: '1.5rem', listStyle: 'none', flex: 1, flexWrap: 'nowrap', overflow: 'hidden' }}
            className="nav-links">
          {['Action','Isekai','Romance','Fantasy','Shounen','Psychological'].map(g => (
            <li key={g} style={{ whiteSpace: 'nowrap' }}>
              <a href={`/?genre=${g}`}
                 style={{ color: activeGenre === g ? 'var(--acc)' : 'var(--mu2)', fontSize: '.87rem', fontWeight: 500, transition: 'color .2s' }}>
                {g}
              </a>
            </li>
          ))}
        </ul>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center', flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search anime…"
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>
      </nav>

      {/* Genre bar */}
      <div style={{
        position: 'sticky', top: 'var(--nav)', zIndex: 400, height: 'var(--gbar)',
        display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto',
        padding: '0 clamp(1rem,4vw,3rem)',
        background: 'rgba(7,9,15,.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--b0)', scrollbarWidth: 'none',
      }}>
        <a href="/" className={`gpill${!activeGenre ? ' on' : ''}`}>🏠 All</a>
        {GENRES.map(g => (
          <a key={g} href={`/?genre=${encodeURIComponent(g)}`}
             className={`gpill${activeGenre === g ? ' on' : ''}`}>
            {g}
          </a>
        ))}
      </div>

      <style>{`
        .nav-links { display: none !important; }
        @media(min-width: 860px) { .nav-links { display: flex !important; } }
        .gpill {
          background: var(--s2); border: 1.5px solid var(--b1); color: var(--mu2);
          border-radius: 20px; padding: 4px 15px; font-size: .8rem; font-weight: 600;
          transition: all .18s; white-space: nowrap; flex-shrink: 0;
          text-decoration: none;
        }
        .gpill:hover, .gpill.on {
          background: var(--acc); border-color: var(--acc); color: #fff;
          box-shadow: 0 3px 12px var(--accg);
        }
        .search-input {
          background: var(--s2); border: 1.5px solid var(--b1); border-radius: 9px;
          padding: 8px 15px; color: var(--txt); font-family: inherit; font-size: .87rem;
          width: 200px; outline: none; transition: border-color .25s, width .3s;
        }
        .search-input:focus { border-color: var(--acc); width: 260px; }
        .search-input::placeholder { color: var(--mu); }
        .search-btn {
          background: var(--acc); border: none; border-radius: 9px; color: #fff;
          padding: 8px 18px; font-size: .87rem; font-weight: 700; cursor: pointer;
          font-family: inherit; white-space: nowrap;
        }
        @media(max-width:600px) { .search-input { width: 130px !important; } .search-input:focus { width: 170px !important; } }
      `}</style>
    </>
  );
}
