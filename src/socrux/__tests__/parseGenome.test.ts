import { describe, it, expect } from 'vitest'
import { parseFasta } from '../parseGenome'

describe('parseFasta', () => {
  it('parses a single-sequence FASTA', () => {
    const result = parseFasta('>seq1\nATCG\nGCTA\n')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('seq1')
    expect(result[0].sequence).toBe('ATCGGCTA')
  })

  it('parses multi-sequence FASTA', () => {
    const result = parseFasta('>seq1\nATCG\n>seq2\nTTAA\nCCGG\n')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'seq1', sequence: 'ATCG' })
    expect(result[1]).toEqual({ name: 'seq2', sequence: 'TTAACCGG' })
  })

  it('handles Windows line endings (\\r\\n)', () => {
    const result = parseFasta('>seq1\r\nATCG\r\nGCTA\r\n')
    expect(result).toHaveLength(1)
    expect(result[0].sequence).toBe('ATCGGCTA')
  })

  it('returns empty array for empty input', () => {
    expect(parseFasta('')).toEqual([])
    expect(parseFasta('\n\n\n')).toEqual([])
  })

  it('strips whitespace from sequence lines', () => {
    const result = parseFasta('>seq1\n  ATCG  \n GCTA \n')
    expect(result[0].sequence).toBe('ATCGGCTA')
  })

  it('extracts only the first word from a multi-word header', () => {
    const result = parseFasta('>contig_1 length=4641652 gc=50.7\nATCG\n')
    expect(result[0].name).toBe('contig_1')
  })

  it('converts lowercase sequences to uppercase', () => {
    const result = parseFasta('>seq1\natcg\ngcta\n')
    expect(result[0].sequence).toBe('ATCGGCTA')
  })

  it('ignores blank lines between sequences', () => {
    const result = parseFasta('>seq1\nATCG\n\nGCTA\n')
    expect(result[0].sequence).toBe('ATCGGCTA')
  })

  it('handles FASTA with no trailing newline', () => {
    const result = parseFasta('>seq1\nATCG')
    expect(result).toHaveLength(1)
    expect(result[0].sequence).toBe('ATCG')
  })
})
