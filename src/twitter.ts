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
