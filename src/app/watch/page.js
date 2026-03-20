import NavbarWrapper from '../../components/NavbarWrapper';
import WatchClient from './WatchClient';
import { getAnimeDetails, getTitle } from '../../lib/anilist';

export async function generateMetadata({ searchParams }) {
  try {
    const sp    = await Promise.resolve(searchParams);
    const title = String(sp?.title || 'Anime');
    const ep    = String(sp?.ep    || '1');
    return { title: `${title} — Episode ${ep} | AniStream` };
  } catch {
    return { title: 'AniStream' };
  }
}

export default async function WatchPage({ searchParams }) {
  const sp  = await Promise.resolve(searchParams);
  const id  = parseInt(sp?.id  || '0', 10) || 0;
  const ep  = parseInt(sp?.ep  || '1', 10) || 1;
  const eps = parseInt(sp?.eps || '0', 10) || 0;
  const cat = sp?.cat === 'dub' ? 'dub' : 'sub';
  const titleParam = String(sp?.title || 'Anime');

  let anime = null;
  if (id > 0) {
    anime = await getAnimeDetails(id);
  }

  const animeTitle = anime ? getTitle(anime) : titleParam;
  const maxEps     = anime?.episodes || eps || 100;

  const relations = (anime?.relations?.edges ?? []).filter(
    e => ['SEQUEL','PREQUEL','SIDE_STORY'].includes(e.relationType) && e.node?.type === 'ANIME'
  );
  const recs = (anime?.recommendations?.nodes ?? [])
    .map(n => n?.mediaRecommendation)
    .filter(Boolean);

  return (
    <>
      <NavbarWrapper />
      <WatchClient
        anime={anime}
        animeTitle={animeTitle}
        alId={id}
        initialEp={ep}
        maxEps={maxEps}
        initialCat={cat}
        relations={relations}
        recs={recs}
      />
    </>
  );
}
