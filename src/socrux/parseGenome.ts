export interface FastaEntry {
  name: string
  sequence: string
}

export function parseFasta(text: string): FastaEntry[] {
  const entries: FastaEntry[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let currentName = ''
  let currentSeq: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('>')) {
      if (currentName) {
        entries.push({ name: currentName, sequence: currentSeq.join('') })
      }
      currentName = trimmed.slice(1).split(/\s/)[0]
      currentSeq = []
    } else if (trimmed && currentName) {
      currentSeq.push(trimmed.toUpperCase())
    }
  }
  if (currentName) {
    entries.push({ name: currentName, sequence: currentSeq.join('') })
  }
  return entries
}
