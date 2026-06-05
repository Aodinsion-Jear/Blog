export type SearchablePost = {
  searchText: string;
};

export type SearchIndexPost = SearchablePost & {
  slug: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  tags: string[];
};

export function searchPosts<T extends SearchablePost>(posts: T[], query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return posts;
  }

  return posts.filter((post) => post.searchText.includes(normalizedQuery));
}
