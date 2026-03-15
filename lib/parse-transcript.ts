/**
 * .txt / .vtt / .srt ファイルのテキストを抽出する
 */
export function parseTranscript(filename: string, content: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'vtt') return parseVtt(content)
  if (ext === 'srt') return parseSrt(content)
  return content.trim()
}

/** WebVTT: タイムスタンプ・メタデータ行を除去して字幕テキストのみ抽出 */
function parseVtt(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === 'WEBVTT') continue
    if (trimmed.startsWith('NOTE')) continue
    if (/^\d{2}:\d{2}/.test(trimmed) && trimmed.includes('-->')) continue
    if (/^[A-Z-]+:/.test(trimmed)) continue   // REGION, STYLE など
    result.push(trimmed)
  }

  return result.join('\n')
}

/** SRT: 番号行・タイムスタンプ行を除去して字幕テキストのみ抽出 */
function parseSrt(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^\d+$/.test(trimmed)) continue                                      // 連番行
    if (/^\d{2}:\d{2}:\d{2},\d{3}.*-->/.test(trimmed)) continue             // タイムスタンプ行
    result.push(trimmed)
  }

  return result.join('\n')
}
