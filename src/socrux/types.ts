export interface Operon {
  start: number
  end: number
  forward: boolean // true = forward strand
}

export interface Fragment {
  number: number
  startPos: number
  endPos: number
  sequence: string
}

export interface ClassifiedFragment extends Fragment {
  refNumber: number // matching reference fragment number
  orientation: '+' | '-' // forward or reversed relative to reference
  identity: number // % identity to reference
  dnaA: boolean // contains origin of replication marker
  dif: boolean // contains terminus marker
}

export interface GSProfile {
  gsId: string // e.g. "GS1.0"
  fragmentOrder: string[] // e.g. ["1", "2'", "3", "4", "5"]
  quality: 'GREEN' | 'AMBER' | 'RED'
}

export interface SpeciesManifestEntry {
  id: string
  name: string
  fragmentCount: number
  genomeSize: string
  description: string
}

export interface SpeciesDB {
  id: string
  name: string
  fragmentCount: number
  fragments: Record<string, string> // ref fragment number -> sequence
  profiles: { gs: string; fragments: string[] }[]
  rrna: { '16S': string; '23S': string; '5S': string }
  metadata: {
    dnaaFragment: number
    difFragment: number
    dnaaForwardOrientation: boolean
  }
}

export interface AlignmentHit {
  queryName: string
  queryLen: number
  queryStart: number
  queryEnd: number
  strand: '+' | '-'
  targetName: string
  targetLen: number
  targetStart: number
  targetEnd: number
  numMatches: number
  blockLen: number
  mapQ: number
}

export interface SocruxResult {
  inputFile: string
  species: string
  gsProfile: GSProfile
  fragments: ClassifiedFragment[]
  operons: Operon[]
  genomeLength: number
  genomeName: string
}

export interface Markers {
  dnaA: Record<string, string> // name -> sequence (~1350bp each)
  dif: Record<string, string>  // name -> sequence (28bp each)
}

export interface SocruxOptions {
  species: string
}

export const DEFAULT_OPTIONS: SocruxOptions = {
  species: 'Escherichia_coli',
}
