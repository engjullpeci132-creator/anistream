import Link from 'next/link';
import { getTitle, getCover, getScore, getEps } from '../lib/anilist';

export default function AnimeCard({ anime }) {
  const title = getTitle(anime);
  const cover = getCover(anime);
  const score = getScore(anime);
  const eps   = getEps(anime);
  const year  = anime.seasonYear || '';
  const genres = (anime.genres || []).slice(0, 2).join(' · ');

  return (
    <Link
      href={`/watch?id=${anime.id}&ep=1&title=${encodeURIComponent(title)}&eps=${anime.episodes || 0}`}
      className="ac"
    >
      <div className="ac-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={title}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/200x300/0d1017/444?text=No+Image'; }}
        />
        {score && <div className="ac-score">★ {score}</div>}
        <div className="ac-ep">{eps}</div>
        <div className="ac-play">
          <div className="play-btn">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      </div>
      <div className="ac-body">
        <div className="ac-title">{title}</div>
        <div className="ac-meta">{year}{year && genres ? ' · ' : ''}{genres}</div>
      </div>
    </Link>
  );
}
