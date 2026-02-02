import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Env } from './types';
import { searchPopularTweets } from './twitter';
import { sendToTeams } from './teams';
import { getPostedTweetIds, addPostedTweetIds } from './storage';

// Reactコンポーネント: ホームページ
function HomePage() {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>X to Teams</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            backdrop-filter: blur(10px);
          }
          h1 {
            margin: 0 0 20px 0;
            font-size: 2.5em;
          }
          p {
            line-height: 1.6;
            opacity: 0.9;
          }
          .endpoint {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          code {
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>X to Teams</h1>
          <p>指定したXアカウントの注目投稿をMicrosoft Teamsに自動通知するアプリです</p>
          <p>毎週月曜・木曜の朝9時（JST）に自動実行されます</p>
          <div className="endpoint">
            <h2>テストエンドポイント</h2>
            <p>手動で実行する場合：</p>
            <code>GET /test</code>
          </div>
        </div>
      </body>
    </html>
  );
}

// Reactコンポーネント: テスト結果ページ
interface TestResultPageProps {
  alreadyPostedCount: number;
  newArticlesCount: number;
  articles: Array<{
    tweet_id: string;
    author_name: string;
    author_username: string;
    text: string;
    like_count: number;
  }>;
}

function TestResultPage({ alreadyPostedCount, newArticlesCount, articles }: TestResultPageProps) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>テスト結果 - X to Teams</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 40px;
            background: #f5f5f5;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #667eea;
            margin: 0 0 30px 0;
          }
          .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat {
            flex: 1;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
          }
          .stat-label {
            margin-top: 8px;
            color: #666;
            font-size: 0.9em;
          }
          .article {
            border: 1px solid #e0e0e0;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
          }
          .article-header {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
          }
          .article-text {
            color: #555;
            line-height: 1.6;
            margin-bottom: 10px;
          }
          .article-meta {
            color: #999;
            font-size: 0.9em;
          }
          .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>テスト実行結果</h1>

          <div className="success">
            実行成功：Teamsに通知を送信しました
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-value">{alreadyPostedCount}</div>
              <div className="stat-label">投稿済み</div>
            </div>
            <div className="stat">
              <div className="stat-value">{newArticlesCount}</div>
              <div className="stat-label">新規記事</div>
            </div>
          </div>

          <h2>取得した記事</h2>
          {articles.length > 0 ? (
            articles.map((article, index) => (
              <div key={article.tweet_id} className="article">
                <div className="article-header">
                  {index + 1}. {article.author_name} (@{article.author_username})
                </div>
                <div className="article-text">
                  {article.text.length > 200 ? article.text.substring(0, 200) + '...' : article.text}
                </div>
                <div className="article-meta">
                  いいね: {article.like_count.toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p>新しい記事は見つかりませんでした</p>
          )}
        </div>
      </body>
    </html>
  );
}

// Reactコンポーネント: エラーページ
interface ErrorPageProps {
  error: string;
}

function ErrorPage({ error }: ErrorPageProps) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>エラー - X to Teams</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 40px;
            background: #ffebee;
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 600px;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #d32f2f;
            margin: 0 0 20px 0;
          }
          .error-message {
            background: #ffcdd2;
            color: #b71c1c;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>エラーが発生しました</h1>
          <div className="error-message">{error}</div>
        </div>
      </body>
    </html>
  );
}

export default {
  /**
   * Scheduled event handler - scheduled関数はReactなしでそのまま
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered at:', new Date(event.scheduledTime).toISOString());

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
   * Fetch handler - ここでReactを使用
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // テスト実行用エンドポイント
    if (url.pathname === '/test') {
      try {
        if (!env.TWITTER_BEARER_TOKEN) {
          // Reactでエラーページを返す
          const html = renderToString(<ErrorPage error="TWITTER_BEARER_TOKEN is not set" />);
          return new Response(html, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        if (!env.TEAMS_WEBHOOK_URL) {
          const html = renderToString(<ErrorPage error="TEAMS_WEBHOOK_URL is not set" />);
          return new Response(html, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        if (!env.POSTED_TWEETS) {
          const html = renderToString(<ErrorPage error="POSTED_TWEETS KV namespace is not bound" />);
          return new Response(html, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }

        // 投稿済みツイートIDを取得
        const postedTweetIds = await getPostedTweetIds(env.POSTED_TWEETS);
        console.log(`Found ${postedTweetIds.size} already posted tweets`);

        // 新しい記事を検索
        const articles = await searchPopularTweets(env.TWITTER_BEARER_TOKEN, postedTweetIds);

        // Teamsに通知
        if (articles.length > 0) {
          await sendToTeams(env.TEAMS_WEBHOOK_URL, articles);

          // 新しいツイートIDを保存
          const newTweetIds = articles.map(a => a.tweet_id);
          await addPostedTweetIds(env.POSTED_TWEETS, postedTweetIds, newTweetIds);
        }

        // Reactで結果ページを返す
        const html = renderToString(
          <TestResultPage
            alreadyPostedCount={postedTweetIds.size}
            newArticlesCount={articles.length}
            articles={articles}
          />
        );

        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      } catch (error) {
        console.error('Error in test endpoint:', error);

        // Reactでエラーページを返す
        const html = renderToString(
          <ErrorPage error={error instanceof Error ? error.message : 'Unknown error'} />
        );

        return new Response(html, {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }

    // デフォルトレスポンス - Reactでホームページを返す
    const html = renderToString(<HomePage />);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
