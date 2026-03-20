import NavbarWrapper from '../../components/NavbarWrapper';
import WatchClient from './WatchClient';
import { getAnimeDetails, getTitle } from '../../lib/anilist';

// Next 15: searchParams is a Promise
export async function generateMetadata({ searchParams }) {
  const sp    = await searchParams;
  const title = sp?.title || 'Anime';
  const ep    = sp?.ep    || '1';
  return { title: `${title} Episode ${ep} — AniStream` };
}

export default async function WatchPage({ searchParams }) {
  const sp    = await searchParams;
  const id    = parseInt(sp?.id    || '0', 10);
  const ep    = parseInt(sp?.ep    || '1', 10);
  const title = sp?.title || 'Anime';
  const eps   = parseInt(sp?.eps   || '0', 10);
  const cat   = sp?.cat === 'dub' ? 'dub' : 'sub';

  const anime = id ? await getAnimeDetails(id) : null;
  const animeTitle = anime ? getTitle(anime) : title;

  const relations = (anime?.relations?.edges || []).filter(
    e => ['SEQUEL', 'PREQUEL', 'SIDE_STORY'].includes(e.relationType) && e.node?.type === 'ANIME'
  );
  const recs = (anime?.recommendations?.nodes || [])
    .map(n => n.mediaRecommendation)
    .filter(Boolean);

  return (
    <>
      <NavbarWrapper />
      <WatchClient
        anime={anime}
        animeTitle={animeTitle}
        alId={id}
        initialEp={ep}
        maxEps={anime?.episodes || eps || 100}
        initialCat={cat}
        relations={relations}
        recs={recs}
      />
    </>
  );
}
