'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, BarChart3, CheckCircle2, ChevronRight, Download, FileImage,
  History, Home, Image as ImageIcon, LayoutDashboard, LogOut, Menu,
  RefreshCcw, Search, Settings, Shield, Sparkles, Ticket, Upload,
  UserCircle2, Wand2, X, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// --- CONFIG & CONSTANTES ---
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
type Section = 'overview' | 'image-agent' | 'history' | 'tickets' | 'settings'

interface SeoResult {
  detectedContent: string; suggestedAltText: string; metaTitle: string;
  metaDescription: string; keywords: string[]; seoScore: number;
  improvements: string[]; imageCategory: string; tone: string;
}

interface AnalysisHistory {
  id: string; image_name: string | null; image_size: number | null;
  seo_score: number; alt_text: string; meta_title: string;
  keywords: string[]; image_category: string; created_at: string;
}

interface TicketItem {
  id: string; title: string; description: string;
  status: 'Ouvert' | 'En Cours' | 'Fermé'; priority: 'Haute' | 'Moyenne' | 'Basse';
  created_at: string; replies?: { id: string }[];
}

// --- HELPERS (TES FONCTIONS ORIGINALES) ---
const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'image-agent', label: 'Image Agent', icon: FileImage },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value?: string) {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString() } catch { return value }
}

function scoreTone(score: number) {
  if (score >= 80) return { label: 'Excellent', cls: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 60) return { label: 'Correct', cls: 'text-yellow-400', bar: 'bg-yellow-400' }
  return { label: 'À améliorer', cls: 'text-red-400', bar: 'bg-red-400' }
}

function statusTone(status?: string) {
  if (status === 'Fermé') return 'border-emerald-500/20 text-emerald-400'
  if (status === 'En Cours') return 'border-yellow-500/20 text-yellow-400'
  return 'border-brand/20 text-brand'
}

function priorityTone(priority?: string) {
  if (priority === 'Haute') return 'border-red-500/20 text-red-400'
  if (priority === 'Basse') return 'border-emerald-500/20 text-emerald-400'
  return 'border-yellow-500/20 text-yellow-400'
}

function CircularScore({ score }: { score: number }) {
  const radius = 48; const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const tone = scoreTone(score)
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
        <motion.circle initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: progress }} transition={{ duration: 1, ease: "easeOut" }}
          cx="60" cy="60" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" strokeDasharray={circumference}
          className={cn(tone.bar === 'bg-emerald-400' && 'text-emerald-400', tone.bar === 'bg-yellow-400' && 'text-yellow-400', tone.bar === 'bg-red-400' && 'text-red-400')} />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-black tracking-tight">{score}</div>
        <div className="mt-1 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Score SEO</div>
      </div>
    </div>
  )
}

function GooglePreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white p-6 text-black shadow-2xl">
      <p className="text-[11px] text-green-700">seopic.io › images › ...</p>
      <h3 className="mt-1 text-[22px] leading-tight text-[#1a0dab] font-medium">{title || 'Titre SEO de l\'image'}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4d5156]">{description || 'Votre meta description apparaîtra ici pour booster votre visibilité.'}</p>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon }: any) {
  return (
    <Card className="rounded-[28px] border-white/5 bg-white/[0.02] backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12"><Icon className="h-5 w-5 text-brand" /></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="mt-2 text-4xl font-black tracking-tight">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground font-medium">{sub}</p>
      </CardContent>
    </Card>
  )
}

// --- MAIN PAGE ---
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- TES ÉTATS (AUCUN SUPPRIMÉ) ---
  const [section, setSection] = useState<Section>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<SeoResult | null>(null)
  const [seoFilename, setSeoFilename] = useState(''); const [seoTitle, setSeoTitle] = useState('')
  const [seoAltText, setSeoAltText] = useState(''); const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]); const [keywordInput, setKeywordInput] = useState('')
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp'>('jpg'); const [outputQuality, setOutputQuality] = useState(85)
  const [injectLoading, setInjectLoading] = useState(false); const [injectError, setInjectError] = useState<string | null>(null); const [injectSuccess, setInjectSuccess] = useState(false)
  const [history, setHistory] = useState<AnalysisHistory[]>([]); const [historyLoading, setHistoryLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketItem[]>([]); const [ticketsLoading, setTicketsLoading] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false); const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'Moyenne' })
  const [ticketSubmitting, setTicketSubmitting] = useState(false); const [ticketError, setTicketError] = useState<string | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/signin') }, [status, router])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  const fetchHistory = async () => {
    try { setHistoryLoading(true); const res = await fetch('/api/analyses'); if (res.ok) setHistory(await res.json()) } finally { setHistoryLoading(false) }
  }

  const fetchTickets = async () => {
    if (!session?.user?.email) return
    try { setTicketsLoading(true); const res = await fetch(`/api/tickets?email=${encodeURIComponent(session.user.email)}`); if (res.ok) setTickets(await res.json()) } finally { setTicketsLoading(false) }
  }

  useEffect(() => { if (status === 'authenticated') { fetchHistory(); fetchTickets(); } }, [status])

  const openTicketsCount = useMemo(() => tickets.filter((t) => t.status !== 'Fermé').length, [tickets])
  const latestScore = history[0]?.seo_score ?? imageResult?.seoScore ?? 0

  // --- ANALYSE IA (FIXÉE POUR L'ERREUR 400) ---
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return setImageError('Image invalide')
    setImageFile(file); setImageError(null); setImageResult(null)
    const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target?.result as string); reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!imageFile || !imagePreview) return
    setImageLoading(true); setImageError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview.split(',')[1],
          mimeType: imageFile.type,
          imageName: imageFile.name,
          imageSize: imageFile.size // Ajout du champ manquant
        }),
      })
      const data = await res.json()
      if (!res.ok) { setImageError(data.error || 'Erreur API'); return }
      setImageResult(data)
      setSeoFilename(data.metaTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'image-seo')
      setSeoTitle(data.metaTitle || ''); setSeoAltText(data.suggestedAltText || '')
      setSeoDescription(data.metaDescription || ''); setSeoKeywords(data.keywords || [])
      fetchHistory()
    } catch { setImageError('Erreur de connexion.') } finally { setImageLoading(false) }
  }

  const injectAndDownload = async () => {
    if (!imagePreview) return
    setInjectLoading(true)
    try {
      const res = await fetch('/api/inject-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview.split(',')[1], filename: seoFilename, title: seoTitle, altText: seoAltText, description: seoDescription, keywords: seoKeywords, format: outputFormat, quality: outputQuality }),
      })
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${seoFilename}.${outputFormat}`; a.click(); setInjectSuccess(true)
      }
    } finally { setInjectLoading(false) }
  }

  if (status === 'loading') return <div className="h-screen flex items-center justify-center bg-black text-white">Chargement...</div>

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-brand/30">
      {/* EFFETS GLOW (LANDING VIBE) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex min-h-screen">
        {/* SIDEBAR (TON CODE ORIGINAL) */}
        <aside className={cn('sticky top-0 h-screen border-r border-white/5 bg-black/40 backdrop-blur-2xl transition-all duration-300 z-50', sidebarCollapsed ? 'w-20' : 'w-72')}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 flex-shrink-0"><Sparkles className="text-white h-5 w-5" /></div>
              {!sidebarCollapsed && <span className="text-xl font-black tracking-tighter uppercase">Seo<span className="text-brand">Pic</span></span>}
            </div>
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => setSection(item.id)} className={cn("flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all", section === item.id ? "bg-brand text-white shadow-xl shadow-brand/20" : "text-slate-500 hover:bg-white/5 hover:text-slate-200")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                </button>
              ))}
            </nav>
            <div className="mt-auto p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center font-bold text-brand">{session?.user?.name?.[0]}</div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold truncate">{session?.user?.name}</p>
                  <button onClick={() => signOut()} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">Déconnexion</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          {/* HEADER (TON CODE ORIGINAL) */}
          <header className="sticky top-0 z-40 border-b border-white/5 bg-black/20 backdrop-blur-2xl p-6 flex justify-between items-center">
            <h1 className="text-2xl font-black tracking-tight uppercase">{section.replace('-', ' ')}</h1>
            <div className="flex gap-3">
               {isAdmin && <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/5"><Link href="/admin"><Shield size={16} className="mr-2"/> Admin</Link></Button>}
               <Button onClick={fetchData} variant="outline" className="rounded-xl border-white/10 bg-white/5 h-11 w-11 p-0"><RefreshCcw size={18} /></Button>
            </div>
          </header>

          <main className="p-8 lg:p-12 max-w-[1600px] mx-auto w-full">
            
            {section === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Dernier Score SEO" value={latestScore || '—'} sub={scoreTone(latestScore).label} icon={BarChart3} />
                  <StatCard label="Analyses Totales" value={history.length} sub="Historique" icon={History} />
                  <StatCard label="Tickets Ouverts" value={openTicketsCount} sub="Support" icon={Ticket} />
                  <StatCard label="Statut IA" value="Actif" sub="Claude 3.5" icon={Zap} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   <Card className="lg:col-span-8 bg-white/[0.01] border-white/5 rounded-[40px] p-8">
                      <CardTitle className="mb-6">Activités Récentes</CardTitle>
                      <div className="space-y-4">
                        {history.slice(0, 4).map(h => (
                          <div key={h.id} className="flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand"><ImageIcon size={20} /></div>
                                <div><p className="text-sm font-bold truncate max-w-[200px]">{h.image_name}</p><p className="text-[10px] text-slate-500 font-bold">{formatDate(h.created_at)}</p></div>
                            </div>
                            <Badge className={cn("bg-transparent border border-white/10", scoreTone(h.seo_score).cls)}>{h.seo_score}%</Badge>
                          </div>
                        ))}
                      </div>
                   </Card>
                   <Card className="lg:col-span-4 bg-brand border-none rounded-[40px] p-10 text-white flex flex-col justify-between shadow-2xl">
                      <div><h3 className="text-3xl font-black leading-tight mb-4 tracking-tighter">Prêt pour <br/>votre SEO ?</h3><p className="text-white/70 text-sm">Générez vos métadonnées en un clic avec l'agent IA de SeoPic.</p></div>
                      <Button onClick={() => setSection('image-agent')} className="bg-white text-black hover:bg-slate-100 rounded-2xl h-14 font-black">Démarrer</Button>
                   </Card>
                </div>
              </div>
            )}

            {section === 'image-agent' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* COLONNE GAUCHE (PREVIEW) */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
                  <div className="relative aspect-square rounded-[48px] border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center group shadow-2xl">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-contain p-6" alt="Preview" />
                        {imageLoading && (
                          <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[3px] bg-brand shadow-[0_0_30px_#e76f2e] z-20" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Button variant="secondary" className="rounded-2xl font-black px-8" onClick={() => fileInputRef.current?.click()}>Changer</Button>
                        </div>
                      </>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer p-16 text-center group">
                        <div className="h-20 w-20 bg-brand/10 rounded-[32px] flex items-center justify-center mb-8 transition-transform group-hover:scale-110">
                          <Upload className="text-brand h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">Ajouter une image</h3>
                        <p className="text-slate-500 text-sm max-w-[240px]">JPG, PNG ou WebP. Max 10MB.</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                  </div>
                  {imageResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 flex items-center justify-between">
                      <div><span className="text-brand font-black text-[11px] uppercase tracking-widest mb-1 block">Score SEO</span><h3 className="text-3xl font-black">{scoreTone(imageResult.seoScore).label}</h3></div>
                      <CircularScore score={imageResult.seoScore} />
                    </motion.div>
                  )}
                  {!imageResult && imagePreview && (
                    <Button onClick={analyzeImage} disabled={imageLoading} size="lg" className="w-full rounded-[32px] h-20 bg-brand hover:bg-brand/90 text-xl font-black shadow-2xl">
                      {imageLoading ? 'Analyse...' : <><Wand2 className="mr-3 h-6 w-6" /> Analyser avec l'IA</>}
                    </Button>
                  )}
                  {imageError && <p className="text-red-400 text-center font-bold text-sm bg-red-400/10 p-4 rounded-2xl border border-red-500/20">{imageError}</p>}
                </div>

                {/* COLONNE DROITE (ÉDITEUR) */}
                <div className="lg:col-span-7 space-y-8">
                  <Card className="bg-white/[0.03] border-white/10 rounded-[48px] p-8 lg:p-12 shadow-2xl">
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du fichier</label>
                          <div className="flex group">
                            <input type="text" value={seoFilename} onChange={(e) => setSeoFilename(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-l-2xl px-6 h-14 focus:outline-none focus:ring-1 ring-brand font-bold transition-all" />
                            <div className="bg-white/10 border border-l-0 border-white/10 rounded-r-2xl px-5 flex items-center text-slate-500 font-mono text-xs italic font-bold">.{outputFormat}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titre SEO</label>
                            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 h-14 focus:outline-none focus:ring-1 ring-brand font-bold transition-all" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Texte Alt</label><Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-black uppercase">Impact: High</Badge></div>
                        <textarea value={seoAltText} onChange={(e) => setSeoAltText(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-[28px] p-6 focus:outline-none focus:ring-1 ring-brand resize-none font-bold text-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Meta Description</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-[28px] p-6 focus:outline-none focus:ring-1 ring-brand resize-none text-sm text-slate-400" />
                      </div>
                      <div className="pt-8 border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 text-center">Aperçu Google Search</p>
                        <GooglePreview title={seoTitle} description={seoDescription} />
                      </div>
                    </div>
                  </Card>
                  {imageResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-5">
                      <Button onClick={injectAndDownload} disabled={injectLoading} size="lg" className="flex-1 rounded-[32px] h-20 bg-white text-black hover:bg-slate-200 font-black text-xl shadow-xl transition-all hover:-translate-y-1">
                        <Download className="mr-3" /> {injectLoading ? 'Génération...' : 'Exporter & Télécharger'}
                      </Button>
                      <Button onClick={() => { setImageResult(null); setImagePreview(null); }} size="lg" variant="outline" className="rounded-[32px] h-20 border-white/10 bg-white/5 px-10"><RefreshCcw size={28} /></Button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* SECTIONS SUPPLÉMENTAIRES (TON CODE ORIGINAL) */}
            {section === 'history' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-10 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map(h => (
                    <div key={h.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 hover:border-brand/40 transition-all">
                       <div className="flex justify-between items-start mb-6"><Badge className="bg-brand/10 text-brand border-none text-[10px] font-black uppercase">{h.image_category}</Badge><span className="text-[10px] font-bold text-slate-500">{formatDate(h.created_at)}</span></div>
                       <p className="font-bold text-sm truncate mb-1">{h.image_name}</p>
                       <p className="text-[10px] text-slate-600 mb-6 font-bold">{formatBytes(h.image_size)}</p>
                       <div className="flex items-center justify-between border-t border-white/5 pt-4"><span className="text-[10px] font-black text-slate-500 uppercase">Score SEO</span><span className={cn("font-black text-xl", scoreTone(h.seo_score).cls)}>{h.seo_score}%</span></div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {section === 'tickets' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-5 bg-white/[0.02] border-white/5 rounded-[40px] p-8 shadow-2xl">
                  <h3 className="text-2xl font-black mb-2 tracking-tight">Besoin d'aide ?</h3>
                  <p className="text-sm text-slate-500 mb-8">Nous vous répondons en moins de 24h.</p>
                  <Button onClick={() => setShowTicketForm(!showTicketForm)} className="w-full bg-brand rounded-2xl h-14 font-black mb-6">{showTicketForm ? 'Annuler' : 'Ouvrir un ticket'}</Button>
                  {showTicketForm && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <input value={ticketForm.title} onChange={e => setTicketForm({...ticketForm, title: e.target.value})} placeholder="Sujet" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 h-14 focus:outline-none focus:ring-1 ring-brand font-bold" />
                      <textarea value={ticketForm.description} onChange={e => setTicketForm({...ticketForm, description: e.target.value})} placeholder="Détails..." rows={5} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:outline-none focus:ring-1 ring-brand resize-none text-sm" />
                      <Button onClick={submitTicket} disabled={ticketSubmitting} className="w-full bg-white text-black hover:bg-slate-200 rounded-xl h-14 font-black">Envoyer</Button>
                    </motion.div>
                  )}
                </Card>
                <div className="lg:col-span-7 space-y-4">
                  {tickets.map(t => (
                    <div key={t.id} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex justify-between items-center">
                      <div><div className="flex items-center gap-3 mb-2"><span className="text-[10px] font-black text-slate-500 uppercase">{formatDate(t.created_at)}</span><Badge className={cn("bg-transparent border border-white/10 text-[9px] font-black uppercase", priorityTone(t.priority))}>{t.priority}</Badge></div><p className="font-bold text-lg">{t.title}</p></div>
                      <Badge className={cn("bg-transparent border h-10 px-6 rounded-full font-black text-[10px] uppercase", statusTone(t.status))}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'settings' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[48px] p-10 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                     <h3 className="text-2xl font-black border-b border-white/5 pb-6 flex items-center gap-3"><UserCircle2 className="text-brand" size={28}/> Compte</h3>
                     <div className="space-y-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Utilisateur</label><div className="bg-white/[0.03] border border-white/10 rounded-xl px-6 h-14 flex items-center font-bold">{session?.user?.name}</div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label><div className="bg-white/[0.03] border border-white/10 rounded-xl px-6 h-14 flex items-center font-bold">{session?.user?.email}</div></div>
                     </div>
                   </div>
                   <div className="space-y-8">
                     <h3 className="text-2xl font-black border-b border-white/5 pb-6 flex items-center gap-3"><Zap className="text-brand" size={28}/> Technologie IA</h3>
                     <div className="p-6 bg-brand/5 border border-brand/20 rounded-3xl"><p className="text-xs text-slate-400 font-medium">Analyse propulsée par Claude 3.5 Sonnet Vision pour une précision maximale.</p></div>
                   </div>
                </div>
              </Card>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
