/**
 * フレーズの由来（ソース）を表示する小バッジ（T1-5 ソース由来の可視化）。
 * - source_type='System'（初期配布シード）: 「Pick からのおすすめ」と表示し、
 *   生の source_title（"初期フレーズ"）は見せない。
 * - それ以外でソース名あり: 「出典: {source_title}」。
 * - ソース名がなく System でもない: 何も表示しない（null）。
 */
export function SourceBadge({
  sourceType,
  sourceTitle,
  className = '',
}: {
  sourceType?: string | null
  sourceTitle?: string | null
  className?: string
}) {
  const isSystem = sourceType === 'System'
  if (!isSystem && !sourceTitle) return null

  const icon = isSystem ? '📚' : '📎'
  const text = isSystem ? 'Pick からのおすすめ' : `出典: ${sourceTitle}`

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-gray-400 max-w-full ${className}`}
      title={text}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
}
