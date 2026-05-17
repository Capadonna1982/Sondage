import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const COLORS = ['#3d5a3e','#7a9e7e','#b8d4b0','#c4a882','#e8c4b8','#a0b8d4']
const TABS = [
  { label: 'Statistiques', icon: '📊' },
  { label: 'Réponses', icon: '📋' },
  { label: 'Prospects', icon: '📧' },
  { label: 'Constructeur', icon: '⚙️' }
]
const TYPE_LABELS = { radio:'Choix unique', checkbox:'Choix multiple', scale:'Échelle 1–5', text:'Texte court', textarea:'Texte long', yesno:'Oui / Non', rank:'Classement' }

function requireAuth(navigate) {
  if (sessionStorage.getItem('auth') !== 'true') { navigate('/login'); return false }
  return true
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [questions, setQuestions] = useState([])
  const [responses, setResponses] = useState([])
  const [answers, setAnswers] = useState([])
  const [pageViews, setPageViews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireAuth(navigate)) return
    loadAll()

    // Temps réel — mise à jour automatique
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_views' }, () => loadAll())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [qRes, rRes, aRes, vRes] = await Promise.all([
      supabase.from('questions').select('*').order('order_index'),
      supabase.from('responses').select('*').order('created_at', { ascending: false }),
      supabase.from('answers').select('*'),
      supabase.from('page_views').select('*').order('created_at')
    ])
    setQuestions(qRes.data || [])
    setResponses(rRes.data || [])
    setAnswers(aRes.data || [])
    setPageViews(vRes.data || [])
    setLoading(false)
  }

  const views = pageViews.filter(v => v.event === 'view').length
  const submits = pageViews.filter(v => v.event === 'submit').length
  const convRate = views > 0 ? Math.round((submits / views) * 100) : 0
  const prospects = responses.filter(r => r.email)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--forest)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'white' }}>Centre de bien-être</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>· tableau de bord</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/sondage" target="_blank" style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8 }}>Voir le sondage ↗</a>
          <button onClick={() => { sessionStorage.removeItem('auth'); navigate('/login') }}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, background: 'none', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 2rem' }}>
        <div style={{ display: 'flex' }}>
          {TABS.map((t, i) => (
            <button key={t.label} onClick={() => setTab(i)}
              style={{ padding: '14px 18px', fontSize: 14, color: tab === i ? 'var(--forest)' : 'var(--text-soft)', borderBottom: `2px solid ${tab === i ? 'var(--forest)' : 'transparent'}`, fontWeight: tab === i ? 500 : 400, background: 'none', border: 'none', borderBottom: tab === i ? '2px solid var(--forest)' : '2px solid transparent', cursor: 'pointer' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-soft)' }}>Chargement des données…</div>
        ) : (
          <>
            {tab === 0 && <StatsTab questions={questions} responses={responses} answers={answers} views={views} submits={submits} convRate={convRate} prospects={prospects.length} pageViews={pageViews} />}
            {tab === 1 && <ResponsesTab questions={questions} responses={responses} answers={answers} onRefresh={loadAll} />}
            {tab === 2 && <ProspectsTab prospects={prospects} />}
            {tab === 3 && <BuilderTab questions={questions} onRefresh={loadAll} />}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', borderTop: `3px solid ${accent || 'var(--forest)'}` }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 30, fontFamily: 'Playfair Display, serif', color: 'var(--text)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function StatsTab({ questions, responses, answers, views, submits, convRate, prospects, pageViews }) {
  function getChartData(q) {
    const qAns = answers.filter(a => a.question_id === q.id)
    if (!qAns.length) return []
    if (q.type === 'radio' || q.type === 'yesno') {
      const counts = {}
      qAns.forEach(a => { const v = JSON.parse(a.value); counts[v] = (counts[v] || 0) + 1 })
      return Object.entries(counts).map(([name, count]) => ({ name, count, pct: Math.round((count/qAns.length)*100) }))
    }
    if (q.type === 'checkbox') {
      const counts = {}
      qAns.forEach(a => { const v = JSON.parse(a.value); if(Array.isArray(v)) v.forEach(x => { counts[x] = (counts[x]||0)+1 }) })
      return Object.entries(counts).map(([name, count]) => ({ name, count, pct: Math.round((count/qAns.length)*100) }))
    }
    if (q.type === 'scale') {
      const counts = {1:0,2:0,3:0,4:0,5:0}
      qAns.forEach(a => { const v = JSON.parse(a.value); counts[v] = (counts[v]||0)+1 })
      return Object.entries(counts).map(([name, count]) => ({ name: name+'★', count }))
    }
    return []
  }

  const avgScale = () => {
    const q = questions.find(q => q.type === 'scale')
    if (!q) return null
    const qAns = answers.filter(a => a.question_id === q.id)
    if (!qAns.length) return null
    return (qAns.reduce((s,a) => s+JSON.parse(a.value), 0) / qAns.length).toFixed(1)
  }

  const dailyData = (() => {
    const byDay = {}
    pageViews.forEach(v => {
      const day = v.created_at.slice(0,10)
      if (!byDay[day]) byDay[day] = { date: day, views: 0, submits: 0 }
      if (v.event === 'view') byDay[day].views++
      if (v.event === 'submit') byDay[day].submits++
    })
    return Object.values(byDay).slice(-14)
  })()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Pages vues" value={views} sub="visites totales du sondage" accent="var(--forest)" />
        <StatCard label="Soumissions" value={submits} sub="sondages complétés" accent="var(--forest-mid)" />
        <StatCard label="Taux de conversion" value={convRate + '%'} sub="vues → soumissions" accent="var(--warm)" />
        <StatCard label="Prospects (courriel)" value={prospects} sub="contacts qualifiés" accent="var(--blush)" />
        {avgScale() && <StatCard label="Priorité bien-être moy." value={avgScale() + ' ★'} sub="sur 5" accent="#d4a854" />}
      </div>

      {dailyData.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-mid)' }}>Activité quotidienne (14 derniers jours)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#b8a898' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#b8a898' }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#7a9e7e" strokeWidth={2} dot={false} name="Vues" />
              <Line type="monotone" dataKey="submits" stroke="#3d5a3e" strokeWidth={2} dot={false} name="Soumissions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {questions.filter(q => ['radio','checkbox','scale','yesno'].includes(q.type)).map(q => {
        const data = getChartData(q)
        if (!data.length) return null
        return (
          <div key={q.id} className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 18, color: 'var(--text)' }}>{q.text}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={Math.max(140, data.length * 36)}>
                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#8a7e78' }} />
                  <Tooltip formatter={v => [`${v} réponse${v>1?'s':''}`]} cursor={{ fill: 'var(--forest-light)' }} />
                  <Bar dataKey="count" fill="var(--forest)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                    label={({ pct }) => pct + '%'} labelLine={false}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v} réponse${v>1?'s':''}`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}

      {responses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-soft)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ fontWeight: 500 }}>Aucune réponse pour l'instant</p>
          <p style={{ fontSize: 14, marginTop: 6 }}>Partagez le lien du sondage pour commencer à recevoir des données.</p>
        </div>
      )}
    </div>
  )
}

function ResponsesTab({ questions, responses, answers, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  function getAnswersFor(rid) { return answers.filter(a => a.response_id === rid) }
  function getQ(qid) { return questions.find(q => q.id === qid) }
  function formatVal(val) {
    try {
      const v = JSON.parse(val)
      if (Array.isArray(v)) return v.join(', ')
      if (typeof v === 'object') return Object.entries(v).map(([k,n]) => `${k}: #${n}`).join(', ')
      return String(v)
    } catch { return val }
  }

  async function deleteResponse(e, rid) {
    e.stopPropagation()
    if (!confirm('Supprimer cette réponse définitivement ?')) return
    setDeleting(rid)
    try {
      const { error: err1 } = await supabase.from('answers').delete().eq('response_id', rid)
      if (err1) { console.error('Erreur suppression answers:', err1); setDeleting(null); return }
      const { error: err2 } = await supabase.from('responses').delete().eq('id', rid)
      if (err2) { console.error('Erreur suppression response:', err2); setDeleting(null); return }
      if (selected === rid) setSelected(null)
      await onRefresh()
    } catch(err) {
      console.error('Erreur suppression:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>{responses.length} réponse(s) enregistrée(s)</p>
      {responses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-soft)' }}>Aucune réponse pour l'instant.</div>
      )}
      {responses.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 10, cursor: 'pointer', borderLeft: selected === r.id ? '3px solid var(--forest)' : '3px solid transparent', padding: '14px 20px', opacity: deleting === r.id ? 0.5 : 1 }}
          onClick={() => setSelected(selected === r.id ? null : r.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.email || 'Anonyme'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{new Date(r.created_at).toLocaleDateString('fr-CA', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: r.completed ? 'var(--forest-light)' : 'var(--blush-light)', color: r.completed ? 'var(--forest-dark)' : '#c0605e' }}>
                {r.completed ? '✓ Complété' : 'Partiel'}
              </span>
              <button onClick={(e) => deleteResponse(e, r.id)} disabled={deleting === r.id}
                style={{ fontSize: 12, padding: '4px 10px', color: '#c0605e', border: '1px solid #f5c0c0', borderRadius: 8, cursor: 'pointer', background: 'none', flexShrink: 0 }}>
                {deleting === r.id ? '…' : 'Supprimer'}
              </button>
            </div>
          </div>
          {selected === r.id && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {getAnswersFor(r.id).map(a => {
                const q = getQ(a.question_id)
                return (
                  <div key={a.id}>
                    <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 2 }}>{q?.text}</p>
                    <p style={{ fontSize: 14 }}>{formatVal(a.value)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProspectsTab({ prospects }) {
  function exportCSV() {
    const rows = [['Courriel','Date'], ...prospects.map(r => [r.email, new Date(r.created_at).toLocaleDateString('fr-CA')])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prospects.csv'; a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Liste de prospects</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{prospects.length} personne(s) ayant fourni leur courriel</p>
        </div>
        {prospects.length > 0 && <button onClick={exportCSV} className="btn-secondary" style={{ fontSize: 13 }}>⬇ Exporter CSV</button>}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {prospects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-soft)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📧</div>
            <p>Aucun prospect pour l'instant.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Courriel','Date d\'inscription'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, color: 'var(--text-hint)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prospects.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--forest)' }}>{r.email}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-soft)', fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString('fr-CA', { day:'numeric', month:'long', year:'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function BuilderTab({ questions, onRefresh }) {
  const [localQs, setLocalQs] = useState(questions)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [newQ, setNewQ] = useState({ text:'', type:'radio', options:['','',''], required:false })
  const dragIdx = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => setLocalQs(questions), [questions])

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2500) }

  async function saveOrder() {
    setSaving(true)
    await Promise.all(localQs.map((q,i) => supabase.from('questions').update({ order_index: i+1 }).eq('id', q.id)))
    setSaving(false); flash('Ordre sauvegardé ✓'); onRefresh()
  }

  async function toggleActive(q) {
    await supabase.from('questions').update({ active: !q.active }).eq('id', q.id); onRefresh()
  }

  async function deleteQ(id) {
    if (!confirm('Supprimer cette question ?')) return
    await supabase.from('questions').delete().eq('id', id); onRefresh()
  }

  async function addQuestion() {
    if (!newQ.text.trim()) { flash('Le texte est requis.'); return }
    const opts = ['radio','checkbox','rank'].includes(newQ.type) ? newQ.options.filter(o => o.trim()) : null
    const maxOrder = Math.max(0, ...localQs.map(q => q.order_index))
    const { error } = await supabase.from('questions').insert({ text: newQ.text, type: newQ.type, options: opts, required: newQ.required, order_index: maxOrder+1, active: true })
    if (error) { flash('Erreur lors de l\'ajout.'); return }
    setNewQ({ text:'', type:'radio', options:['','',''], required:false }); setAdding(false)
    flash('Question ajoutée ✓'); onRefresh()
  }

  function onDragStart(idx) {
    dragIdx.current = idx
  }

  function onDragEnter(idx) {
    if (dragIdx.current === null || dragIdx.current === idx) return
    setDragOver(idx)
    const next = [...localQs]
    const dragged = next.splice(dragIdx.current, 1)[0]
    next.splice(idx, 0, dragged)
    dragIdx.current = idx
    setLocalQs(next)
  }

  function onDragEnd() {
    dragIdx.current = null
    setDragOver(null)
  }

  const hasOpts = ['radio','checkbox','rank'].includes(newQ.type)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>Gestion des questions</h2>
          <p style={{ fontSize: 13, color: 'var(--text-hint)', marginTop: 4 }}>Glissez-déposez pour réordonner · cliquez Sauvegarder pour appliquer</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: 'var(--forest)', padding: '6px 12px', background: 'var(--forest-light)', borderRadius: 8 }}>{msg}</span>}
          <button onClick={saveOrder} className="btn-secondary" disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder l\'ordre'}</button>
          <button onClick={() => setAdding(!adding)} className="btn-primary">+ Ajouter une question</button>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20, borderTop: '3px solid var(--forest)' }}>
          <p style={{ fontWeight: 500, marginBottom: 16 }}>Nouvelle question</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display:'block', fontSize:13, color:'var(--text-soft)', marginBottom:4 }}>Texte de la question</label>
              <input type="text" value={newQ.text} onChange={e => setNewQ(p => ({...p, text:e.target.value}))} placeholder="Ex: Quel est votre profil?" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:13, color:'var(--text-soft)', marginBottom:4 }}>Type</label>
                <select value={newQ.type} onChange={e => setNewQ(p => ({...p, type:e.target.value, options:['','','']}))} style={{ padding:'10px 14px' }}>
                  {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:22 }}>
                <input type="checkbox" id="req-new" checked={newQ.required} onChange={e => setNewQ(p => ({...p, required:e.target.checked}))} style={{ width:'auto' }} />
                <label htmlFor="req-new" style={{ fontSize:14, cursor:'pointer' }}>Obligatoire</label>
              </div>
            </div>
            {hasOpts && (
              <div>
                <label style={{ display:'block', fontSize:13, color:'var(--text-soft)', marginBottom:4 }}>Options</label>
                {newQ.options.map((o,i) => (
                  <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
                    <input type="text" value={o} onChange={e => { const opts=[...newQ.options]; opts[i]=e.target.value; setNewQ(p=>({...p,options:opts})) }} placeholder={`Option ${i+1}`} />
                    <button onClick={() => setNewQ(p=>({...p,options:p.options.filter((_,j)=>j!==i)}))} style={{ padding:'0 10px', color:'var(--text-soft)', fontSize:20, cursor:'pointer', flexShrink:0 }}>×</button>
                  </div>
                ))}
                <button onClick={() => setNewQ(p=>({...p,options:[...p.options,'']}))} style={{ fontSize:13, color:'var(--forest)', cursor:'pointer', marginTop:4 }}>+ Ajouter option</button>
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={addQuestion} className="btn-primary" style={{ fontSize:14 }}>Ajouter au sondage</button>
              <button onClick={() => setAdding(false)} className="btn-secondary" style={{ fontSize:14 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div>
        {localQs.map((q, idx) => (
          <div
            key={q.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            className="card"
            style={{
              marginBottom: 8,
              opacity: q.active ? 1 : 0.55,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              cursor: 'grab',
              border: dragOver === idx ? '1.5px dashed var(--forest-mid)' : '1px solid var(--border)',
              background: dragOver === idx ? 'var(--forest-light)' : 'white',
              transition: 'border-color 0.1s, background 0.1s',
              userSelect: 'none',
            }}>
            <div style={{ color: 'var(--text-hint)', fontSize: 18, cursor: 'grab', flexShrink: 0, lineHeight: 1 }} title="Glisser pour réordonner">
              ⠿
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-hint)', width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--forest-light)', color: 'var(--forest-dark)' }}>{TYPE_LABELS[q.type]}</span>
                {q.required && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fdf0f1', color: '#c0605e' }}>Obligatoire</span>}
                {!q.active && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', color: 'var(--text-hint)' }}>Masquée</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onMouseDown={e => e.stopPropagation()}>
              <button onClick={() => toggleActive(q)} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>{q.active ? 'Masquer' : 'Afficher'}</button>
              <button onClick={() => deleteQ(q.id)} style={{ fontSize: 12, padding: '5px 10px', color: '#c0605e', border: '1px solid #f5c0c0', borderRadius: 8, cursor: 'pointer', background: 'none' }}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
