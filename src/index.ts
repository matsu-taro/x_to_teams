import type { Env } from './types';
import { searchPopularTweets } from './twitter';
import { sendToTeams } from './teams';
import { getPostedTweetIds, addPostedTweetIds } from './storage';

export default {
  /**
   * Scheduled event handler - 毎日朝9時に実行される
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('実行日時:', new Date(event.scheduledTime).toISOString());

    try {
      // 環境変数の確認
      if (!env.TWITTER_BEARER_TOKEN) {
        throw new Error('TWITTER_BEARER_TOKEN が設定されてません');
      }
      if (!env.TEAMS_WEBHOOK_URL) {
        throw new Error('TEAMS_WEBHOOK_URL が設定されてません');
      }
      if (!env.POSTED_TWEETS) {
        throw new Error('POSTED_TWEETS KV namespace が設定されてません');
      }

      //  投稿済みツイートIDを取得、X APIで直近1週間の人気ツイートを検索（重複除外）
      const postedTweetIds = await getPostedTweetIds(env.POSTED_TWEETS);
      const articles = await searchPopularTweets(env.TWITTER_BEARER_TOKEN, postedTweetIds);

      // Teamsに通知
      if (articles.length > 0) {
        await sendToTeams(env.TEAMS_WEBHOOK_URL, articles);

        // 新しいツイートIDをKVに保存
        const newTweetIds = articles.map(a => a.tweet_id);
        await addPostedTweetIds(env.POSTED_TWEETS, postedTweetIds, newTweetIds);
      } else {
        console.log('新しい投稿はありません');
      }
    } catch (error) {
      console.error('エラーが発生しました:', error);
    }
  },

  /**
   * Fetch handler - 手動トリガー用（テスト用）
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // テスト実行用エンドポイント
    if (url.pathname === '/test') {
      try {
        //  投稿済みツイートIDを取得、X APIで直近1週間の人気ツイートを検索（重複除外）
        const postedTweetIds = await getPostedTweetIds(env.POSTED_TWEETS);
        const articles = await searchPopularTweets(env.TWITTER_BEARER_TOKEN, postedTweetIds);

        // Teamsに通知
        if (articles.length > 0) {
          await sendToTeams(env.TEAMS_WEBHOOK_URL, articles);

          // 新しいツイートIDを保存
          const newTweetIds = articles.map(a => a.tweet_id);
          await addPostedTweetIds(env.POSTED_TWEETS, postedTweetIds, newTweetIds);
        }

        return new Response(
          JSON.stringify({
            success: true,
            already_posted_count: postedTweetIds.size,
            new_articles_count: articles.length,
            articles: articles,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('エラーが発生しました:', error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // デフォルトレスポンス
    return new Response('X to Teamsアプリだよ', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
