import { useCallback } from 'react'
import { saveAs } from 'file-saver'
import type { SocruxResult } from '../socrux/types'

interface ResultsTableProps {
  result: SocruxResult
}

export function ResultsTable({ result }: ResultsTableProps) {
  const { gsProfile, fragments, inputFile, species } = result

  const qualityClass = gsProfile.quality.toLowerCase()

  const handleExport = useCallback(() => {
    const header = 'File\tSpecies\tGS_Profile\tQuality\tFragment_Order'
    const row = `${inputFile}\t${species}\t${gsProfile.gsId}\t${gsProfile.quality}\t${gsProfile.fragmentOrder.join(' ')}`

    const fragHeader = '\n\nFragment\tRef_Number\tOrientation\tIdentity\tDnaA\tDif'
    const fragRows = fragments.map(f =>
      `${f.number}\t${f.refNumber}\t${f.orientation}\t${f.identity.toFixed(1)}%\t${f.dnaA}\t${f.dif}`
    ).join('\n')

    const blob = new Blob([header + '\n' + row + fragHeader + '\n' + fragRows], { type: 'text/tab-separated-values' })
    saveAs(blob, `socrux_${inputFile.replace(/\.[^.]+$/, '')}.tsv`)
  }, [inputFile, species, gsProfile, fragments])

  return (
    <div className="profile-display">
      <div className="results-header">
        <h2>Results</h2>
        <div className="results-actions">
          <span className={`quality-badge quality-badge--${qualityClass}`}>
            {gsProfile.quality}
          </span>
          <button className="export-button" onClick={handleExport}>Export TSV</button>
        </div>
      </div>

      <div className="profile-summary">
        <div className="profile-item">
          <span className="profile-label">Input File</span>
          <span className="profile-value">{inputFile}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Species</span>
          <span className="profile-value">{species.replace(/_/g, ' ')}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">GS Profile</span>
          <span className="profile-value">{gsProfile.gsId}</span>
        </div>
      </div>

      <div className="fragment-order">
        Fragment Order: {gsProfile.fragmentOrder.join(' ')}
      </div>

      <div className="results-table-container" style={{ marginTop: '1rem' }}>
        <table className="results-table">
          <thead>
            <tr>
              <th>Fragment</th>
              <th>Reference</th>
              <th>Orientation</th>
              <th>Identity</th>
              <th>Markers</th>
            </tr>
          </thead>
          <tbody>
            {fragments.map(f => (
              <tr key={f.number}>
                <td>{f.number}</td>
                <td>{f.refNumber}</td>
                <td>{f.orientation === '+' ? 'Forward' : 'Reversed'}</td>
                <td>{f.identity.toFixed(1)}%</td>
                <td>
                  {f.dnaA && <span style={{ color: 'var(--gx-warning)', marginRight: '0.5rem' }}>Ori</span>}
                  {f.dif && <span style={{ color: 'var(--gx-info)' }}>Ter</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
