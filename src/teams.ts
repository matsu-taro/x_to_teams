import type { NewsArticle, TeamsCard } from './types';
import { getTweetUrl } from './twitter';

/**
 * TeamsにAdaptive Cardを送信
 */
export async function sendToTeams(webhookUrl: string, articles: NewsArticle[]): Promise<void> {
  if (articles.length === 0) {
    // 記事がない場合は通知しない
    console.log('No articles to send to Teams');
    return;
  }

  const card = buildAdaptiveCard(articles);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(card),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teams webhook error: ${response.status} - ${errorText}`);
  }

  console.log(`Successfully sent ${articles.length} articles to Teams`);
}

/**
 * Teams用のAdaptive Cardを構築
 */
function buildAdaptiveCard(articles: NewsArticle[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = formatDate(yesterday);

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `📣 ${dateStr}の注目ポスト！ 📣`,
              weight: 'Bolder',
              size: 'Large',
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: `IT関連の投稿をまとめたよ`,
              wrap: true,
              spacing: 'Small',
              isSubtle: true,
            },
            {
              type: 'TextBlock',
              text: ' ',
              spacing: 'Medium',
            },
            ...articles.flatMap((article, index) => buildArticleSection(article, index + 1)),
          ],
        },
      },
    ],
  };
}

/**
 * 記事セクションを構築
 */
function buildArticleSection(article: NewsArticle, index: number) {
  const tweetUrl = getTweetUrl(article.author_username, article.tweet_id);

  return [
    {
      type: 'Container',
      separator: index > 1,
      spacing: 'Medium',
      items: [
        {
          type: 'TextBlock',
          text: `**${index}. ${article.author_name}** (@${article.author_username})`,
          weight: 'Bolder',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: truncateText(article.text, 200),
          wrap: true,
          spacing: 'Small',
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '💡 投稿を見る',
              url: tweetUrl,
            },
          ],
        },
      ],
    },
  ];
}

/**
 * 数値をカンマ区切りでフォーマット
 */
function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

/**
 * 日付をフォーマット（YYYY年MM月DD日）
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * テキストを指定文字数で切り詰め
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
