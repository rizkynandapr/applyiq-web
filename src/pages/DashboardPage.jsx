import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './DashboardPage.css'

const SEGMENTS = 10
const PROCESSING_WINDOW_MS = 5 * 60 * 1000 // anggap masih proses selama 5 menit
const POLL_FAST = 5000
const POLL_SLOW = 30000

function ScoreMeter({ score }) {
  const filled = Math.round(((score || 0) / 100) * SEGMENTS)
  const tone = score >= 75 ? 'hi' : score >= 50 ? 'mid' : 'lo'
  return (
    <span className={`meter ${tone}`} title={`${score}/100`}>
      <span className="meter-cells" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <i key={i} className={i < filled ? 'fill' : ''} />
        ))}
      </span>
      <span className="meter-num">{String(score ?? 0).padStart(3, '0')}</span>
    </span>
  )
}

function DashboardPage() {
  const location = useLocation()
  const email = location.state?.email || ''
  const submitted = location.state?.submitted || false

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCL, setActiveCL] = useState(null)
  const [copied, setCopied] = useState(false)
  const submittedAtRef = useRef(submitted ? Date.now() : null)

  // masih dalam window "processing"?
  const isProcessing = submitted
    && submittedAtRef.current
    && (Date.now() - submittedAtRef.current) < PROCESSING_WINDOW_MS

  const fetchJobs = useCallback(async () => {
    setError('')
    try {
      let query = supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (email) query = query.eq('submitter_email', email)
      const { data, error: dbError } = await query
      if (dbError) throw dbError
      setJobs(data || [])
    } catch (err) {
      console.error(err)
      setError('Could not load matches. Check your connection and reload.')
    } finally {
      setLoading(false)
    }
  }, [email])

  // initial fetch + adaptive polling (fallback kalau realtime tidak aktif)
  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, isProcessing ? POLL_FAST : POLL_SLOW)
    return () => clearInterval(interval)
  }, [fetchJobs, isProcessing])

  // realtime: tiap INSERT dari n8n langsung masuk satu-satu
  useEffect(() => {
    const channel = supabase
      .channel('job_inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_applications' },
        (payload) => {
          const row = payload.new
          if (email && row.submitter_email !== email) return
          setJobs((prev) => {
            if (prev.some((j) => j.id === row.id)) return prev
            return [row, ...prev]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [email])

  const total = jobs.length
  const recommended = jobs.filter((j) => j.recommendation === 'apply').length
  const avgScore = total > 0
    ? Math.round(jobs.reduce((s, j) => s + (j.match_score || 0), 0) / total)
    : 0

  const copyLetter = () => {
    navigator.clipboard.writeText(activeCL.cover_letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showProcessing = isProcessing && total === 0 && !error
  const showEmpty = !loading && !isProcessing && total === 0 && !error

  return (
    <div className="board">
      <header className="board-bar">
        <Link to="/" className="wordmark">APPLY<span>IQ</span></Link>
        <div className="bar-right">
          <span className="bar-meta">
            {email ? `KEY: ${email.toUpperCase()}` : 'ALL RESULTS'}
          </span>
          <button className="btn-ghost sm" onClick={fetchJobs}>Reload</button>
          <Link to="/"><button className="btn-solid sm">New search</button></Link>
        </div>
      </header>

      <main className="board-body">
        <div className="stat-strip">
          <div className="stat">
            <span className="stat-label">MATCHES FOUND</span>
            <span className="stat-num">{String(total).padStart(3, '0')}</span>
          </div>
          <div className="stat">
            <span className="stat-label">WORTH APPLYING</span>
            <span className="stat-num accent">{String(recommended).padStart(3, '0')}</span>
          </div>
          <div className="stat">
            <span className="stat-label">AVG MATCH INDEX</span>
            <span className="stat-num">{String(avgScore).padStart(3, '0')}</span>
          </div>
          <div className="stat">
            <span className="stat-label">FEED</span>
            <span className={`stat-num live ${isProcessing ? 'busy' : ''}`}>
              {isProcessing ? 'PROCESSING' : 'LIVE'}
            </span>
          </div>
        </div>

        {error && <div className="board-error">{error}</div>}

        {loading && total === 0 && !showProcessing && (
          <div className="board-state">
            <span className="pulse-dot" /> Loading matches…
          </div>
        )}

        {showProcessing && (
          <div className="board-processing">
            <div className="run-meter" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>
            <span className="panel-tag">ANALYSIS IN PROGRESS</span>
            <h3>Scanning listings and scoring matches</h3>
            <p>
              Your resume is being parsed and compared against live job listings.
              Matches appear here one by one as they're scored — usually within
              one to two minutes. Keep this page open.
            </p>
            <div className="proc-steps">
              <span>RESUME PARSE</span>
              <span>JOB SEARCH</span>
              <span>MATCH SCORING</span>
              <span>COVER LETTERS</span>
            </div>
          </div>
        )}

        {showEmpty && (
          <div className="board-empty">
            <span className="panel-tag">NO DATA YET</span>
            <h3>Your matches will appear here</h3>
            <p>
              Analysis usually takes a minute or two after submitting a resume.
              This page refreshes itself automatically.
            </p>
            <Link to="/"><button className="btn-solid">Start a search</button></Link>
          </div>
        )}

        {total > 0 && (
          <>
            {isProcessing && (
              <div className="proc-banner">
                <span className="pulse-dot" />
                Analysis still running — new matches are added as they're scored.
              </div>
            )}
            <div className="match-table-wrap">
              <table className="match-table">
                <thead>
                  <tr>
                    <th>ROLE / COMPANY</th>
                    <th>MATCH INDEX</th>
                    <th>VERDICT</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="m-role">{job.job_title || '—'}</div>
                        <div className="m-co">{job.company || '—'}</div>
                      </td>
                      <td><ScoreMeter score={job.match_score} /></td>
                      <td>
                        <span className={`verdict ${job.recommendation === 'apply' ? 'go' : 'hold'}`}>
                          {job.recommendation === 'apply' ? 'APPLY' : 'REVIEW'}
                        </span>
                      </td>
                      <td className="m-actions">
                        {job.cover_letter && (
                          <button className="btn-ghost sm" onClick={() => setActiveCL(job)}>
                            Cover letter
                          </button>
                        )}
                        {job.job_link && (
                          <a href={job.job_link} target="_blank" rel="noreferrer">
                            <button className="btn-solid sm">Open listing ↗</button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {activeCL && (
        <div className="overlay" onClick={() => setActiveCL(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <div>
                <span className="panel-tag">COVER LETTER</span>
                <h3>{activeCL.job_title}</h3>
                <p className="sheet-co">{activeCL.company}</p>
              </div>
              <button className="sheet-close" onClick={() => setActiveCL(null)} aria-label="Close">✕</button>
            </div>
            <div className="sheet-body">{activeCL.cover_letter}</div>
            <button className="btn-solid" style={{ width: '100%' }} onClick={copyLetter}>
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
