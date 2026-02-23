import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { SpeciesSelect } from './components/SpeciesSelect'
import { LogConsole } from './components/LogConsole'
import { ResultsTable } from './components/ResultsTable'
import { GenomeMap } from './components/GenomeMap'
import { AboutPage } from './components/AboutPage'
import { runSocrux } from './socrux/pipeline'
import type { SocruxResult } from './socrux/types'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'analysis' | 'about'

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState('Escherichia_coli')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<SocruxResult | null>(null)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('gx-theme') as Theme) || 'dark'
  })
  const [currentView, setCurrentView] = useState<View>('analysis')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gx-theme', theme)
  }, [theme])

  const handleRun = useCallback(async () => {
    if (files.length === 0) return
    setRunning(true)
    setError('')
    setResult(null)
    setLogLines([])
    setProgress('Starting...')
    setProgressPct(0)

    try {
      const res = await runSocrux(
        files,
        { species: selectedSpecies },
        (msg, pct) => { setProgress(msg); setProgressPct(pct) },
        (msg) => { setLogLines(prev => [...prev, msg]) },
      )
      setResult(res)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [files, selectedSpecies])

  const canRun = files.length > 0 && !running

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>socrux</h1>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <p className="subtitle">Genome Structure Typing in the Browser</p>
        <nav className="tab-bar">
          <button className={`tab ${currentView === 'analysis' ? 'tab-active' : ''}`} onClick={() => setCurrentView('analysis')}>Analysis</button>
          <button className={`tab ${currentView === 'about' ? 'tab-active' : ''}`} onClick={() => setCurrentView('about')}>About</button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'analysis' ? (
          <>
            <div className="controls">
              <FileUpload files={files} onFilesChange={setFiles} disabled={running} />
              <SpeciesSelect selectedSpecies={selectedSpecies} onSpeciesChange={setSelectedSpecies} disabled={running} />
            </div>
            <button className="run-button" onClick={handleRun} disabled={!canRun}>
              {running ? 'Running...' : 'Run Analysis'}
            </button>

            {running && (
              <section className="progress" aria-live="polite">
                <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="progress-text">{progress}</p>
              </section>
            )}

            {error && (
              <section className="error" role="alert"><p>{error}</p></section>
            )}

            {result && (
              <>
                <GenomeMap fragments={result.fragments} operons={result.operons} genomeName={result.genomeName} genomeLength={result.genomeLength} quality={result.gsProfile.quality} />
                <ResultsTable result={result} />
              </>
            )}

            {logLines.length > 0 && <LogConsole lines={logLines} />}
          </>
        ) : (
          <AboutPage />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>GenomicX &mdash; open-source bioinformatics for the browser</span>
          <div className="footer-links">
            <a href="https://github.com/genomicx" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://genomicx.vercel.app/about" target="_blank" rel="noopener noreferrer">Mission</a>
            <a href="https://www.happykhan.com/" target="_blank" rel="noopener noreferrer">Nabil-Fareed Alikhan</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
