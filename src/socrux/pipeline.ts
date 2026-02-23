import type { AlignmentHit, SocruxResult, SocruxOptions } from './types'
import { parseFasta } from './parseGenome'
import { findOperons } from './findOperons'
import { extractFragments } from './extractFragments'
import { classifyFragments } from './classifyFragments'
import { assignProfile } from './assignProfile'
import { loadSpeciesDB, loadMarkers } from './databases'

// Aioli is loaded globally via CDN script tag
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Aioli: any

function revComp(seq: string): string {
  const comp: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G', N: 'N' }
  return seq.split('').reverse().map(b => comp[b] ?? 'N').join('')
}

/** Return the fragment number (1-based) that contains genomic position pos, or 0 if none. */
function findFragmentAtPos(pos: number, fragments: import('./types').Fragment[]): number {
  for (const frag of fragments) {
    if (frag.startPos <= frag.endPos) {
      if (pos >= frag.startPos && pos < frag.endPos) return frag.number
    } else {
      // wrapping fragment
      if (pos >= frag.startPos || pos < frag.endPos) return frag.number
    }
  }
  return 0
}

type ProgressCallback = (msg: string, pct: number) => void
type LogCallback = (msg: string) => void

/**
 * Parse minimap2 PAF output into AlignmentHit format.
 *
 * PAF columns (0-indexed):
 *   0: qName   1: qLen   2: qStart   3: qEnd   4: strand
 *   5: tName   6: tLen   7: tStart   8: tEnd
 *   9: nMatch  10: blockLen  11: mapQ
 */
export function parsePAF(pafText: string): AlignmentHit[] {
  const hits: AlignmentHit[] = []
  const lines = pafText.trim().split('\n')

  for (const line of lines) {
    if (!line) continue
    const fields = line.split('\t')
    if (fields.length < 12) continue

    const queryName = fields[0]
    const queryLen = parseInt(fields[1], 10)
    const queryStart = parseInt(fields[2], 10)
    const queryEnd = parseInt(fields[3], 10)
    const strandRaw = fields[4]
    const targetName = fields[5]
    const targetLen = parseInt(fields[6], 10)
    const targetStart = parseInt(fields[7], 10)
    const targetEnd = parseInt(fields[8], 10)
    const numMatches = parseInt(fields[9], 10)
    const blockLen = parseInt(fields[10], 10)
    const mapQ = parseInt(fields[11], 10)

    if (
      isNaN(queryLen) || isNaN(queryStart) || isNaN(queryEnd) ||
      isNaN(targetLen) || isNaN(targetStart) || isNaN(targetEnd) ||
      isNaN(numMatches) || isNaN(blockLen) || isNaN(mapQ) ||
      blockLen === 0
    ) continue

    if (strandRaw !== '+' && strandRaw !== '-') continue
    const strand: '+' | '-' = strandRaw

    hits.push({
      queryName,
      queryLen,
      queryStart,
      queryEnd,
      strand,
      targetName,
      targetLen,
      targetStart,
      targetEnd,
      numMatches,
      blockLen,
      mapQ,
    })
  }

  return hits
}

/**
 * Run socrux structural typing analysis on a bacterial genome FASTA file.
 *
 * Pipeline:
 * 1. Parse FASTA input (use largest contig as genome)
 * 2. Load species reference database
 * 3. Align rRNA reference sequences against genome to detect operons
 * 4. Extract inter-operon fragments
 * 5. Align reference fragments against extracted fragments for classification
 * 6. Assign genome structure (GS) profile
 */
export async function runSocrux(
  inputFiles: File[],
  options: SocruxOptions,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<SocruxResult> {
  const file = inputFiles[0]

  onProgress('Reading genome file...', 0)
  onLog(`Processing: ${file.name}`)
  const text = await file.text()

  onProgress('Parsing FASTA...', 5)
  const fastaEntries = parseFasta(text)
  if (fastaEntries.length === 0) {
    throw new Error('No sequences found in input file')
  }

  // Use the largest contig — for complete genomes this is the chromosome
  const largestContig = fastaEntries.reduce((a, b) =>
    a.sequence.length >= b.sequence.length ? a : b,
  )
  const genomeName = largestContig.name
  const genomeSeq = largestContig.sequence
  const genomeLength = genomeSeq.length
  onLog(`Genome: ${genomeName} (${genomeLength.toLocaleString()} bp)`)

  onProgress('Loading species database...', 10)
  onLog(`Loading database for ${options.species}`)
  const [db, markers] = await Promise.all([
    loadSpeciesDB(options.species),
    loadMarkers(),
  ])
  onLog(`Loaded ${db.name}: ${db.fragmentCount} reference fragments`)

  onProgress('Initializing minimap2...', 15)
  const cli = await new Aioli(['minimap2/2.22'])

  // Mount genome as the alignment target
  const genomeFasta = `>${genomeName}\n${genomeSeq}\n`
  await cli.mount({ name: 'genome.fa', data: genomeFasta })

  // Build rRNA reference FASTA (query sequences aligned against genome)
  const rrnaFasta = [
    `>16S_rRNA\n${db.rrna['16S']}`,
    `>23S_rRNA\n${db.rrna['23S']}`,
    `>5S_rRNA\n${db.rrna['5S']}`,
  ].join('\n') + '\n'
  await cli.mount({ name: 'rrna.fa', data: rrnaFasta })

  // Step 1: detect rRNA operons — genome is reference, rRNA seqs are query
  onProgress('Detecting rRNA operons...', 20)
  onLog('Aligning rRNA sequences against genome')
  const rrnaOutput: string = await cli.exec('minimap2 -k 14 -w 4 -N 50 genome.fa rrna.fa')
  const rrnaHits = parsePAF(rrnaOutput)
  onLog(`${rrnaHits.length} rRNA alignment hits`)

  const operons = findOperons(rrnaHits)
  onLog(`Detected ${operons.length} rRNA operons`)

  if (operons.length === 0) {
    throw new Error(
      'No rRNA operons detected. Verify the input is a complete genome and the correct species is selected.',
    )
  }

  // Step 2: extract inter-operon fragments
  onProgress('Extracting fragments...', 50)
  const fragments = extractFragments(genomeSeq, operons)
  onLog(`Extracted ${fragments.length} inter-operon fragments`)

  // Step 3: classify fragments by aligning against species reference fragments
  // Reference fragments are the target, extracted fragments are the query
  const refFragFasta =
    Object.entries(db.fragments)
      .map(([num, seq]) => `>ref_${num}\n${seq}`)
      .join('\n') + '\n'
  await cli.mount({ name: 'ref_fragments.fa', data: refFragFasta })

  const extractedFragFasta =
    fragments.map(f => `>fragment_${f.number}\n${f.sequence}`).join('\n') + '\n'
  await cli.mount({ name: 'fragments.fa', data: extractedFragFasta })

  onProgress('Classifying fragments...', 60)
  onLog('Aligning extracted fragments against reference')
  const fragOutput: string = await cli.exec('minimap2 ref_fragments.fa fragments.fa')
  const fragHits = parsePAF(fragOutput)
  onLog(`${fragHits.length} fragment alignment hits`)

  const classified = classifyFragments(fragments, fragHits, [])

  // Step 3b: detect markers via species metadata (reference fragment numbers for dnaA/dif)
  // and verify ter (dif site) by substring scan of genome as a cross-check
  onProgress('Detecting oriC and ter markers...', 75)

  // oriC: the reference fragment that contains dnaA is defined in species metadata.
  // We compare as strings to avoid type mismatch between JSON strings and numeric refNumber.
  const dnaaRefStr = String(db.metadata.dnaaFragment)
  const difRefStr  = String(db.metadata.difFragment)

  // ter: also verify dif site by substring scan of genome sequence
  onLog('Scanning genome for dif site sequences')
  const difSet = new Set<string>()
  for (const seq of Object.values(markers.dif)) {
    difSet.add(seq)
    difSet.add(revComp(seq))
  }
  const difFragments = new Set<number>()
  for (const difSeq of difSet) {
    const pos = genomeSeq.indexOf(difSeq)
    if (pos >= 0) {
      const fragNum = findFragmentAtPos(pos, fragments)
      if (fragNum > 0) difFragments.add(fragNum)
    }
  }
  onLog(`ter (dif site) found in fragment(s): ${[...difFragments].join(', ') || 'none — using metadata'}`)

  const withMarkers = classified.map(f => {
    const refStr = String(f.refNumber)
    // dnaA: fragment that maps to the reference oriC fragment
    const hasDnaA = refStr === dnaaRefStr
    // dif: prefer genomic scan result; fall back to metadata reference fragment
    const hasDif  = difFragments.size > 0 ? difFragments.has(f.number) : refStr === difRefStr
    return { ...f, dnaA: hasDnaA, dif: hasDif }
  })

  // Step 4: assign GS profile
  onProgress('Assigning genome structure profile...', 90)
  const gsProfile = assignProfile(withMarkers, db)
  onLog(`Profile: ${gsProfile.gsId} [${gsProfile.quality}] — ${gsProfile.fragmentOrder.join('-')}`)

  onProgress('Complete', 100)

  return {
    inputFile: file.name,
    species: db.name,
    gsProfile,
    fragments: withMarkers,
    operons,
    genomeLength,
    genomeName,
  }
}
