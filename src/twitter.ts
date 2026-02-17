import type { Tweet, TwitterUser, TwitterSearchResponse, NewsArticle } from './types';

const TARGET_ACCOUNTS = [
  'MacopeninSUTABA',
  'nakajimeeee',
  'AI_LowCode',
  'mako_yukinari',
  'envader_plus',
  'furusatojuku',
  'jalva_dev',
  'takahiroanno',
  'miyashin_prg',
  'taiyo_ai_gakuse',
  'arubeh1207',
  'keitaro_aigc',
  'The_AGI_WAY',
  'masahirochaen',
  'unikoukokun',
  'shota7180',
  'tonkotsuboy_com',
];

/**
 * 指定日数前の日付範囲を取得（JSTベース）
 * @param daysAgo 何日前か（1=前日、2=2日前、3=3日前）
 * @returns { start, end } ISO 8601形式のUTC時刻
 */
function getDateRange(daysAgo: number): { start: string; end: string } {
  const now = new Date();

  // JSTで日付を計算（UTC+9時間）
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);

  // JST基準で日付を設定
  const endDate = new Date(nowJST);
  endDate.setUTCDate(endDate.getUTCDate() - (daysAgo - 1));
  endDate.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 1);

  // UTCに戻す（-9時間）
  const startUTC = new Date(startDate.getTime() - jstOffset);
  const endUTC = new Date(endDate.getTime() - jstOffset);

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString()
  };
}

/**
 * 対象アカウント群の指定日の投稿をまとめて検索（APIコールを最小化）
 */
async function searchTweetsForAccounts(
  bearerToken: string,
  startTime: string,
  endTime: string,
  excludedTweetIds: Set<string>
): Promise<{ tweets: NewsArticle[]; errors: string[] }> {
  const accountQuery = TARGET_ACCOUNTS.map(account => `from:${account}`).join(' OR ');
  const query = `(${accountQuery}) lang:ja has:links -is:retweet -is:reply`;

  const url = new URL('https://api.twitter.com/2/tweets/search/recent');
  url.searchParams.append('query', query);
  url.searchParams.append('start_time', startTime);
  url.searchParams.append('end_time', endTime);
  url.searchParams.append('tweet.fields', 'author_id,created_at,public_metrics,entities');
  url.searchParams.append('expansions', 'author_id');
  url.searchParams.append('user.fields', 'username,name');
  url.searchParams.append('max_results', '50');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `search/recent: ${response.status} ${errorText}`;
      return { errors: [errorMsg], tweets: [] };
    }

    const data: TwitterSearchResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return { tweets: [], errors: [] };
    }

    return { tweets: filterAndTransformTweets(data.data, data.includes?.users || [], excludedTweetIds), errors: [] };
  } catch (error) {
    console.error('Tweet取得処理でエラーが発生しました:', error);
    return { tweets: [], errors: ['search/recent: exception'] };
  }
}

/**
 * 直近1日分から人気ツイートを検索
 * 1回のAPIコールで対象アカウントをまとめて取得
 */
export interface SearchResult {
  articles: NewsArticle[];
  errors: string[];
}

export async function searchPopularTweets(bearerToken: string, excludedTweetIds: Set<string> = new Set()): Promise<SearchResult> {
  console.log('searchPopularTweets started');
  const TARGET_COUNT = 3;
  const errors: string[] = [];

  // 前日のみ検索（API quota節約）
  const { start, end } = getDateRange(1);
  const result = await searchTweetsForAccounts(bearerToken, start, end, excludedTweetIds);
  if (result.errors.length > 0) {
    errors.push(...result.errors);
  }

  // 投稿ID重複を除外しつつ、いいね数でソート
  const uniqueArticles = Array.from(new Map(result.tweets.map(tweet => [tweet.tweet_id, tweet])).values());
  uniqueArticles.sort((a, b) => b.like_count - a.like_count);
  const topArticles = uniqueArticles.slice(0, TARGET_COUNT);

  return { articles: topArticles, errors };
}

/**
 * ツイートをフィルタリングして記事情報に変換
 */
function filterAndTransformTweets(tweets: Tweet[], users: TwitterUser[], excludedTweetIds: Set<string>): NewsArticle[] {
  const userMap = new Map(users.map(u => [u.id, u]));
  const articles: NewsArticle[] = [];

  for (const tweet of tweets) {
    // 既に投稿済みのツイートはスキップ
    if (excludedTweetIds.has(tweet.id)) {
      continue;
    }

    const user = userMap.get(tweet.author_id);
    if (!user) continue;

    // URLが含まれていること（has:links で既にフィルタ済みだが念のため確認）
    const urls = tweet.entities?.urls;
    if (!urls || urls.length === 0) {
      continue;
    }

    // 展開されたURLを取得（t.coではなく元のURL）
    const expandedUrl = urls.find(u => u.expanded_url)?.expanded_url || urls[0].url;

    // メトリクスを取得
    const likeCount = tweet.public_metrics?.like_count || 0;
    const retweetCount = tweet.public_metrics?.retweet_count || 0;

    articles.push({
      tweet_id: tweet.id,
      text: tweet.text,
      url: expandedUrl,
      author_name: user.name,
      author_username: user.username,
      like_count: likeCount,
      retweet_count: retweetCount,
      created_at: tweet.created_at,
    });
  }

  return articles;
}

/**
 * ツイートのURLを生成
 */
export function getTweetUrl(username: string, tweetId: string): string {
  return `https://twitter.com/${username}/status/${tweetId}`;
}
