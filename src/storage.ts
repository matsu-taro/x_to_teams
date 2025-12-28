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

/**
 * 新しいツイートIDを追加して保存
 */
export async function addPostedTweetIds(
  kv: KVNamespace,
  existingIds: Set<string>,
  newIds: string[]
): Promise<void> {
  try {
    // 既存のIDと新しいIDをマージ
    const allIds = new Set([...existingIds, ...newIds]);

    // 配列に変換してKVに保存（7日間のTTL）
    const expirationTtl = 60 * 60 * 24 * EXPIRATION_DAYS; // 秒単位
    await kv.put(POSTED_TWEETS_KEY, JSON.stringify([...allIds]), {
      expirationTtl,
    });

    console.log(`Saved ${allIds.size} tweet IDs to KV (${newIds.length} new)`);
  } catch (error) {
    console.error('Error saving posted tweet IDs:', error);
    throw error;
  }
}

/**
 * 特定のツイートIDが既に投稿済みかチェック
 */
export function isAlreadyPosted(postedIds: Set<string>, tweetId: string): boolean {
  return postedIds.has(tweetId);
}
