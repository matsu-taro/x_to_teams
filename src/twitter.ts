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
 * 1アカウントの指定日の投稿を検索
 */
async function searchTweetsForAccount(
  bearerToken: string,
  account: string,
  startTime: string,
  endTime: string,
  excludedTweetIds: Set<string>
): Promise<{ tweets: NewsArticle[]; errors: string[] }> {
  const query = `from:${account} lang:ja has:links -is:retweet -is:reply`;

  const url = new URL('https://api.twitter.com/2/tweets/search/recent');
  url.searchParams.append('query', query);
  url.searchParams.append('start_time', startTime);
  url.searchParams.append('end_time', endTime);
  url.searchParams.append('tweet.fields', 'author_id,created_at,public_metrics,entities');
  url.searchParams.append('expansions', 'author_id');
  url.searchParams.append('user.fields', 'username,name');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `${account}: ${response.status}`;
      return { errors: [errorMsg], tweets: [] };
    }

    const data: TwitterSearchResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return { tweets: [], errors: [] };
    }

    return { tweets: filterAndTransformTweets(data.data, data.includes?.users || [], excludedTweetIds), errors: [] };
  } catch (error) {
    console.error(`Tweet取得処理でエラーが発生しました ${account}:`, error);
    return { tweets: [], errors: [`${account}: exception`] };
  }
}

/**
 * 直近3日間から人気ツイートを検索
 * 1周目: 全アカウントの前日投稿
 * 2周目: 全アカウントの2日前投稿（5件に満たない場合）
 */
export interface SearchResult {
  articles: NewsArticle[];
  errors: string[];
}

export async function searchPopularTweets(bearerToken: string, excludedTweetIds: Set<string> = new Set()): Promise<SearchResult> {
  console.log('searchPopularTweets started');
  const allArticles: NewsArticle[] = [];
  const TARGET_COUNT = 5;
  const errors: string[] = [];

  // 1日目から2日目まで遡る
  for (let daysAgo = 1; daysAgo <= 2; daysAgo++) {
    const { start, end } = getDateRange(daysAgo);
    // 各アカウントから投稿を取得
    for (const account of TARGET_ACCOUNTS) {
      // 既に5件集まっていたら終了
      if (allArticles.length >= TARGET_COUNT) {
        break;
      }

      const result = await searchTweetsForAccount(bearerToken, account, start, end, excludedTweetIds);
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }

      if (result.tweets.length > 0) {
        // 1アカウントあたり1件のみ追加（多様性確保）
        allArticles.push(result.tweets[0]);
      }
    }

    // 5件集まったら終了
    if (allArticles.length >= TARGET_COUNT) {
      break;
    }
  }

  // いいね数でソート
  allArticles.sort((a, b) => b.like_count - a.like_count);
  const topArticles = allArticles.slice(0, TARGET_COUNT);

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
