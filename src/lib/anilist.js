const URL = 'https://graphql.anilist.co';

const FIELDS = `
  id title { romaji english }
  coverImage { extraLarge large }
  bannerImage genres averageScore episodes
  status season seasonYear format
  description(asHtml: false)
  studios(isMain: true) { nodes { name } }
`;

async function gql(query, variables = {}) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data ?? null;
  } catch {
    return null;
  }
}

export async function getTrending(page = 1) {
  const d = await gql(`
    query($p:Int){
      t:Page(page:$p,perPage:24){
        pageInfo{hasNextPage}
        media(type:ANIME,sort:TRENDING_DESC,isAdult:false){${FIELDS}}
      }
      a:Page(page:1,perPage:12){
        media(type:ANIME,status:RELEASING,sort:POPULARITY_DESC,isAdult:false){${FIELDS}}
      }
    }`, { p: page });
  return {
    trending: d?.t?.media ?? [],
    airing:   d?.a?.media ?? [],
    hasNext:  d?.t?.pageInfo?.hasNextPage ?? false,
  };
}

export async function searchAnime(q, page = 1) {
  const d = await gql(`
    query($s:String,$p:Int){
      Page(page:$p,perPage:24){
        pageInfo{hasNextPage}
        media(search:$s,type:ANIME,sort:SEARCH_MATCH,isAdult:false){${FIELDS}}
      }
    }`, { s: q, p: page });
  return { results: d?.Page?.media ?? [], hasNext: d?.Page?.pageInfo?.hasNextPage ?? false };
}

export async function getByGenre(genre, page = 1) {
  const d = await gql(`
    query($g:String,$p:Int){
      Page(page:$p,perPage:24){
        pageInfo{hasNextPage}
        media(genre:$g,type:ANIME,sort:SCORE_DESC,isAdult:false){${FIELDS}}
      }
    }`, { g: genre, p: page });
  return { results: d?.Page?.media ?? [], hasNext: d?.Page?.pageInfo?.hasNextPage ?? false };
}

export async function getAnimeDetails(id) {
  const d = await gql(`
    query($id:Int){
      Media(id:$id,type:ANIME){
        ${FIELDS} duration
        relations{
          edges{
            relationType
            node{ id title{english romaji} coverImage{large} type format episodes }
          }
        }
        recommendations(perPage:8,sort:RATING_DESC){
          nodes{
            mediaRecommendation{
              id title{english romaji} coverImage{large} averageScore episodes format
            }
          }
        }
      }
    }`, { id });
  return d?.Media ?? null;
}

export const getTitle  = a => a?.title?.english || a?.title?.romaji || 'Unknown';
export const getCover  = a => a?.coverImage?.extraLarge || a?.coverImage?.large || '';
export const getScore  = a => a?.averageScore ? (a.averageScore / 10).toFixed(1) : null;
export const getEps    = a => a?.episodes ? `${a.episodes} eps` : 'Ongoing';
