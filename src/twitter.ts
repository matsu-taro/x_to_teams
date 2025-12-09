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
  }
}

