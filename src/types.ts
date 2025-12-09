// wrangler.toml参照
export interface Env {
  TWITTER_BEARER_TOKEN: string;
  TEAMS_WEBHOOK_URL: string;
  POSTED_TWEETS: KVNamespace;
}

// X 関連の型定義
export interface Tweet { // https://developer.twitter.com/en/docs/twitter-api/data-dictionary/object-model/tweet
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  entities?: {
    urls?: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
    }>;
  };
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface TwitterSearchResponse {
  data?: Tweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

export interface NewsArticle {
  tweet_id: string;
  text: string;
  url: string;
  author_name: string;
  author_username: string;
  like_count: number;
  retweet_count: number;
  created_at: string;
}

// Teams通知用の型定義
export interface TeamsCard {
  "@type": string;
  "@context": string;
  summary: string;
  sections: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    activityImage?: string;
    facts?: Array<{
      name: string;
      value: string;
    }>;
    text?: string;
  }>;
  potentialAction?: Array<{
    "@type": string;
    name: string;
    targets: Array<{
      os: string;
      uri: string;
    }>;
  }>;
}
