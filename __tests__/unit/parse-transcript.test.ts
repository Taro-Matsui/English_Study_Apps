import { describe, it, expect } from 'vitest'
import { parseTranscript } from '@/lib/parse-transcript'

describe('parseTranscript', () => {
  it('.txt はトリムのみ（本文をそのまま）', () => {
    expect(parseTranscript('note.txt', '  hello world  ')).toBe('hello world')
  })

  it('.vtt: WEBVTT / NOTE / タイムスタンプ行を除去し字幕本文のみ残す', () => {
    const vtt = `WEBVTT

NOTE this is a note

00:00:01.000 --> 00:00:04.000
Hello everyone

00:00:04.000 --> 00:00:06.000
Let's get started`
    expect(parseTranscript('cap.vtt', vtt)).toBe("Hello everyone\nLet's get started")
  })

  it('.vtt: REGION / STYLE 等の大文字コロン行を除去', () => {
    const vtt = `WEBVTT
REGION:id=bill
STYLE::cue { color: white }
00:00:01.000 --> 00:00:02.000
Real line`
    expect(parseTranscript('x.vtt', vtt)).toBe('Real line')
  })

  it('.srt: 連番行・タイムスタンプ行を除去し字幕本文のみ残す', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
First subtitle

2
00:00:04,000 --> 00:00:06,000
Second subtitle`
    expect(parseTranscript('m.srt', srt)).toBe('First subtitle\nSecond subtitle')
  })

  it('拡張子なし / 未知拡張子はトリムのみ（vtt/srt 加工しない）', () => {
    expect(parseTranscript('noext', ' abc ')).toBe('abc')
    expect(parseTranscript('a.md', ' # heading ')).toBe('# heading')
  })

  it('拡張子は大文字小文字を区別しない（.VTT でも字幕加工）', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
Upper ext line`
    expect(parseTranscript('cap.VTT', vtt)).toBe('Upper ext line')
  })

  it('空・空白のみは空文字を返す', () => {
    expect(parseTranscript('e.vtt', '\n\n  \n')).toBe('')
  })
})
