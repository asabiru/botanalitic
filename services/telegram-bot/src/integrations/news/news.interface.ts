export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: Date;
  snippet?: string;
}

export interface NewsProvider {
  readonly name: string;
  getNews(keywords: string[]): Promise<NewsItem[]>;
}
