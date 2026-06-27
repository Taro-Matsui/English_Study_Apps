-- =====================================================================
-- Pick — 供給継続率ダッシュボード（T1-3 計測用 SQL）
-- =====================================================================
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行。
--   auth.users を参照するため service_role 相当（SQL Editor）で実行すること。
-- 指標の分母/分子はすべて source_type='System' の初期配布シードを除外する
--   （T1-2(B) のクォータ除外方針と一致させ、シードで継続率が底上げされるのを防ぐ）。
-- 論理削除されたフレーズ（deleted_at IS NOT NULL）も除外する。
-- =====================================================================


-- ---------------------------------------------------------------------
-- クエリ1: 登録後7日以内に「2本目のソース」を投入したユーザー比率
--   2本目 = System 以外の distinct source_title が 2 つ以上
--   母数 = 登録から7日以上経過したユーザー（観測期間を確保）
-- ---------------------------------------------------------------------
WITH user_sources AS (
  SELECT
    u.id AS user_id,
    u.created_at,
    COUNT(DISTINCT p.source_title) FILTER (
      WHERE p.source_type <> 'System'
        AND p.source_title IS NOT NULL
        AND p.deleted_at IS NULL
        AND p.added_date <= (u.created_at + INTERVAL '7 days')::date
    ) AS sources_within_7d
  FROM auth.users u
  LEFT JOIN phrases p ON p.user_id = u.id
  WHERE u.created_at < NOW() - INTERVAL '7 days'   -- 7日経過済みユーザーのみ母数に
  GROUP BY u.id, u.created_at
)
SELECT
  COUNT(*)                                              AS cohort_users,
  COUNT(*) FILTER (WHERE sources_within_7d >= 2)        AS reached_2nd_source,
  ROUND(100.0 * COUNT(*) FILTER (WHERE sources_within_7d >= 2) / NULLIF(COUNT(*),0), 1) AS pct_2nd_source
FROM user_sources;


-- ---------------------------------------------------------------------
-- クエリ2: 直近14日にフレーズを追加した（=供給を続けている）アクティブ率
--   分母 = 直近14日にチャレンジ or 非Systemフレーズ追加で動いたユーザー
--   分子 = そのうち直近14日に非Systemフレーズを追加したユーザー
-- ---------------------------------------------------------------------
WITH active AS (
  SELECT DISTINCT user_id FROM quiz_sessions
    WHERE completed_at >= NOW() - INTERVAL '14 days'
  UNION
  SELECT DISTINCT user_id FROM phrases
    WHERE added_date >= (NOW() - INTERVAL '14 days')::date
      AND source_type <> 'System' AND deleted_at IS NULL
),
supplied AS (
  SELECT DISTINCT user_id FROM phrases
    WHERE added_date >= (NOW() - INTERVAL '14 days')::date
      AND source_type <> 'System' AND deleted_at IS NULL
)
SELECT
  (SELECT COUNT(*) FROM active)                                   AS active_users_14d,
  (SELECT COUNT(*) FROM supplied)                                 AS supplied_users_14d,
  ROUND(100.0 * (SELECT COUNT(*) FROM supplied)
              / NULLIF((SELECT COUNT(*) FROM active),0), 1)       AS pct_still_supplying
FROM (SELECT 1) t;


-- ---------------------------------------------------------------------
-- クエリ3（補助）: 週次サインアップコホート別の 1人あたり非Systemフレーズ供給数
--   供給がコホートごとに伸びているか/萎んでいるかの推移を見る
-- ---------------------------------------------------------------------
SELECT
  date_trunc('week', u.created_at)::date AS signup_week,
  COUNT(DISTINCT u.id)                   AS users,
  ROUND(AVG(cnt.non_system_phrases), 1)  AS avg_user_phrases
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS non_system_phrases
  FROM phrases p
  WHERE p.user_id = u.id AND p.source_type <> 'System' AND p.deleted_at IS NULL
) cnt ON true
GROUP BY 1
ORDER BY 1 DESC;
