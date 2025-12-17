/**
 * 投稿済みツイートID管理モジュール
 * Cloudflare KVを使用してツイートIDを保存・取得
 */

const POSTED_TWEETS_KEY = 'posted_tweet_ids';
const EXPIRATION_DAYS = 7; // 7日間保持

/**
 * 投稿済みツイートIDのセットを取得
 */
export async function getPostedTweetIds(kv: KVNamespace): Promise<Set<string>> {
  try {
    const stored = await kv.get(POSTED_TWEETS_KEY, 'json');
    if (stored && Array.isArray(stored)) {
      return new Set(stored);
    }
  } catch (error) {
    console.error('Error getting posted tweet IDs:', error);
  }
  return new Set();
}
