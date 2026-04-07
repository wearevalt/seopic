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

// --- CONFIGURATION & TYPES (Conservés de ton code original) ---
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

// --- HELPERS DE FORMATAGE ---
const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '—'
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const scoreTone = (score: number) => {
  if (score >= 80) return { label: 'Excellent', cls: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 60) return { label: 'Correct', cls: 'text-yellow-400', bar: 'bg-yellow-400' }
  return { label: 'À améliorer', cls: 'text-red-400', bar: 'bg-red-400' }
}

// --- COMPOSANTS UI RÉUTILISABLES ---
function CircularScore({ score }: { score: number }) {
  const radius = 35; const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const tone = scoreTone(score)
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
        <motion.circle initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: progress }} transition={{ duration: 1.5, ease: "easeOut" }}
          cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} className={cn(tone.cls)} />
      </svg>
      <span className="absolute text-xl font-black">{score}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- TOUS TES ÉTATS ORIGINAUX ---
  const [section, setSection] = useState<Section>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<SeoResult | null>(null)
  
  const [seoFilename, setSeoFilename] = useState(''); const [seoTitle, setSeoTitle] = useState('')
  const [seoAltText, setSeoAltText] = useState(''); const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]); const [keywordInput, setKeywordInput] = useState('')
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp'>('jpg'); const [outputQuality, setOutputQuality] = useState(85)
  
  const [injectLoading, setInjectLoading] = useState(false); const [injectError, setInjectError] = useState<string | null>(null)
  const [injectSuccess, setInjectSuccess] = useState(false)

  const [history, setHistory] = useState<AnalysisHistory[]>([]); const [historyLoading, setHistoryLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketItem[]>([]); const [ticketsLoading, setTicketsLoading] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false); const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'Moyenne' })
  const [ticketSubmitting, setTicketSubmitting] = useState(false); const [ticketError, setTicketError] = useState<string | null>(null)

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  // --- LOGIQUE DE RÉCUPÉRATION (Conservée) ---
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/signin') }, [status, router])

  const fetchData = async () => {
    if (status !== 'authenticated') return
    setHistoryLoading(true); setTicketsLoading(true)
    try {
      const [hRes, tRes] = await Promise.all([
        fetch('/api/analyses'),
        fetch(`/api/tickets?email=${encodeURIComponent(session?.user?.email || '')}`)
      ])
      if (hRes.ok) setHistory(await hRes.json())
      if (tRes.ok) setTickets(await tRes.json())
    } catch (e) { console.error("Fetch error", e) } finally { setHistoryLoading(false); setTicketsLoading(false) }
  }

  useEffect(() => { fetchData() }, [status])

  // --- HANDLERS IMAGE AGENT (FIX 400 ERROR INCLUS) ---
  const handleImageFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return setImageError("Max 10MB")
    const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file); setImageFile(file); setImageResult(null); setImageError(null)
  }

  const analyzeImage = async () => {
    if (!imagePreview || !imageFile) return
    setImageLoading(true); setImageError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview.split(',')[1],
          mimeType: imageFile.type,
          imageName: imageFile.name,
          imageSize: imageFile.size
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setImageResult(data)
        setSeoFilename(data.metaTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'image-seo')
        setSeoTitle(data.metaTitle || ''); setSeoAltText(data.suggestedAltText || '')
        setSeoDescription(data.metaDescription || ''); setSeoKeywords(data.keywords || [])
        fetchData()
      } else { setImageError(data.error || "Erreur d'analyse") }
    } finally { setImageLoading(false) }
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
        const a = document.createElement('a'); a.href = url; a.download = `${seoFilename}.${outputFormat}`
        document.body.appendChild(a); a.click(); a.remove(); setInjectSuccess(true)
      }
    } catch (e) { setInjectError("Erreur téléchargement") } finally { setInjectLoading(false) }
  }

  if (status === 'loading') return <div className="h-screen flex items-center justify-center bg-[#050505] text-white">Chargement du dashboard...</div>

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-brand/30">
      {/* GLOWS AMBIANTS (Landing Style) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-brand/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-orange-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative flex min-h-screen">
        {/* SIDEBAR PREMIUM */}
        <aside className={cn("sticky top-0 h-screen border-r border-white/5 bg-black/40 backdrop-blur-2xl transition-all duration-300 z-50", sidebarCollapsed ? "w-20" : "w-72")}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-12">
              <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 flex-shrink-0"><Sparkles className="text-white h-5 w-5" /></div>
              {!sidebarCollapsed && <span className="text-xl font-black tracking-tighter">SEO<span className="text-brand">PIC</span></span>}
            </div>

            <nav className="flex-1 space-y-2">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'image-agent', icon: Zap, label: 'Image Agent' },
                { id: 'history', icon: History, label: 'Historique' },
                { id: 'tickets', icon: Ticket, label: 'Tickets' },
                { id: 'settings', icon: Settings, label: 'Paramètres' },
              ].map((item) => (
                <button key={item.id} onClick={() => setSection(item.id as Section)} className={cn("flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all", section === item.id ? "bg-brand text-white shadow-xl shadow-brand/10" : "text-slate-500 hover:bg-white/5 hover:text-slate-200")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                </button>
              ))}
            </nav>

            <div className="mt-auto p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center font-bold text-brand">{session?.user?.name?.[0]}</div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{session?.user?.name}</p>
                  <button onClick={() => signOut()} className="text-[10px] text-slate-500 hover:text-red-400">Déconnexion</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
          <header className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight">{section === 'image-agent' ? 'IMAGE AGENT AI' : section.toUpperCase()}</h1>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em] mt-2">Productivité & Optimisation SEO</p>
            </div>
            <div className="flex gap-3">
              {isAdmin && <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/5 h-11"><Link href="/admin"><Shield size={16} className="mr-2"/> Admin</Link></Button>}
              <Button onClick={fetchData} variant="outline" className="rounded-xl border-white/10 bg-white/5 h-11 w-11 p-0"><RefreshCcw size={18} /></Button>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {section === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-white/[0.02] border-white/5 rounded-[32px] p-6">
                    <BarChart3 className="text-brand mb-4" />
                    <div className="text-sm font-bold text-slate-500 uppercase">Dernier Score</div>
                    <div className="text-3xl font-black mt-1">{history[0]?.seo_score || '—'}<span className="text-sm text-slate-600">/100</span></div>
                  </Card>
                  <Card className="bg-white/[0.02] border-white/5 rounded-[32px] p-6">
                    <History className="text-brand mb-4" />
                    <div className="text-sm font-bold text-slate-500 uppercase">Analyses</div>
                    <div className="text-3xl font-black mt-1">{history.length}</div>
                  </Card>
                  <Card className="bg-white/[0.02] border-white/5 rounded-[32px] p-6">
                    <Ticket className="text-brand mb-4" />
                    <div className="text-sm font-bold text-slate-500 uppercase">Tickets</div>
                    <div className="text-3xl font-black mt-1">{tickets.filter(t => t.status !== 'Fermé').length}</div>
                  </Card>
                  <Card className="bg-brand border-none rounded-[32px] p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setSection('image-agent')}>
                    <Zap className="mb-4" />
                    <div className="font-bold">Nouvelle Analyse</div>
                    <div className="text-xs text-white/70 mt-1">Lancer l'agent IA maintenant →</div>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <Card className="lg:col-span-8 bg-white/[0.01] border-white/5 rounded-[40px] p-8">
                    <CardTitle className="mb-6 flex items-center gap-2"><History size={20} className="text-brand"/> Historique Récent</CardTitle>
                    <div className="space-y-3">
                      {history.slice(0, 5).map(h => (
                        <div key={h.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand"><ImageIcon size={20} /></div>
                            <div>
                              <p className="text-sm font-bold truncate max-w-[250px]">{h.image_name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{new Date(h.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={cn("bg-transparent border border-white/10 font-black", scoreTone(h.seo_score).cls)}>{h.seo_score}%</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-white/[0.03] border-brand/20 rounded-[32px] p-8 text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={80} /></div>
                        <h3 className="text-xl font-black mb-2 leading-tight">Booster votre <br/>SEO Visuel</h3>
                        <p className="text-sm text-slate-400 mb-6">L'IA de SeoPic analyse vos images pour un référencement Google optimal.</p>
                        <Button variant="outline" className="rounded-full border-brand/50 text-brand">Voir les conseils</Button>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {section === 'image-agent' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* STUDIO GAUCHE : VISUEL & SCORE */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
                  <div className="relative aspect-square rounded-[48px] border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center group shadow-2xl">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                        {imageLoading && (
                          <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[3px] bg-brand shadow-[0_0_30px_#e76f2e] z-20" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Button variant="secondary" className="rounded-2xl font-black px-8" onClick={() => fileInputRef.current?.click()}>CHANGER L'IMAGE</Button>
                        </div>
                      </>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer p-16 text-center group">
                        <div className="h-24 w-24 bg-brand/10 rounded-[32px] flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:bg-brand/20">
                          <Upload className="text-brand h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">Importer un visuel</h3>
                        <p className="text-slate-500 text-sm max-w-[240px]">Préparez vos images pour un export SEO parfait.</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                  </div>

                  {imageResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 flex items-center justify-between shadow-2xl">
                      <div><span className="text-brand font-black text-[11px] uppercase tracking-[0.3em] mb-1 block">Analyse IA</span><h3 className="text-3xl font-black">{scoreTone(imageResult.seoScore).label}</h3></div>
                      <CircularScore score={imageResult.seoScore} />
                    </motion.div>
                  )}

                  {!imageResult && imagePreview && (
                    <Button onClick={analyzeImage} disabled={imageLoading} size="lg" className="w-full rounded-[32px] h-20 bg-brand hover:bg-brand/90 text-xl font-black shadow-2xl shadow-brand/20 transition-all hover:-translate-y-1">
                      {imageLoading ? 'GÉNÉRATION EN COURS...' : <><Wand2 className="mr-3 h-6 w-6" /> ANALYSER AVEC L'IA</>}
                    </Button>
                  )}
                  {imageError && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center text-sm font-bold">{imageError}</div>}
                </div>

                {/* STUDIO DROITE : ÉDITEUR PRODUCTIF */}
                <div className="lg:col-span-7 space-y-8">
                  <Card className="bg-white/[0.03] border-white/10 rounded-[48px] p-8 lg:p-12 shadow-2xl">
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nom du fichier final</label>
                          <div className="flex group">
                            <input type="text" value={seoFilename} onChange={(e) => setSeoFilename(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-l-2xl px-6 h-14 focus:outline-none focus:ring-2 ring-brand/50 transition-all font-bold" />
                            <div className="bg-white/10 border border-l-0 border-white/10 rounded-r-2xl px-5 flex items-center text-slate-500 font-mono text-xs font-bold uppercase italic">.{outputFormat}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Titre SEO de la page</label>
                            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 h-14 focus:outline-none focus:ring-2 ring-brand/50 transition-all font-bold" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Texte Alternatif (Alt Tag)</label><Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-black uppercase tracking-widest">SEO IMPACT: HIGH</Badge></div>
                        <textarea value={seoAltText} onChange={(e) => setSeoAltText(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-[28px] p-6 focus:outline-none focus:ring-2 ring-brand/50 transition-all resize-none font-bold leading-relaxed text-slate-200" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Meta Description suggérée</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-[28px] p-6 focus:outline-none focus:ring-2 ring-brand/50 transition-all resize-none text-sm text-slate-400 leading-relaxed" />
                      </div>

                      {/* GOOGLE PREVIEW RÉALISTE */}
                      <div className="pt-10 border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 text-center">Simulation de recherche Google</p>
                        <div className="bg-white rounded-[32px] p-8 shadow-2xl max-w-2xl mx-auto border border-slate-200">
                          <div className="text-[#1a0dab] text-xl font-medium truncate mb-1 underline hover:no-underline cursor-pointer">{seoTitle || 'Titre SEO de l\'image'}</div>
                          <div className="text-[#006621] text-xs mb-2 truncate">https://seopic.io › images › <span className="font-bold">{seoFilename || 'image-seo'}</span></div>
                          <div className="text-[#4d5156] text-sm line-clamp-2 leading-relaxed">{seoDescription || 'La meta description optimisée s\'affichera ici pour booster votre taux de clic sur Google Images et la recherche classique.'}</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {imageResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-5">
                      <Button onClick={injectAndDownload} disabled={injectLoading} size="lg" className="flex-1 rounded-[32px] h-20 bg-white text-black hover:bg-slate-200 font-black text-xl shadow-2xl transition-all hover:-translate-y-1">
                        <Download className="mr-3 h-7 w-7" /> {injectLoading ? 'GÉNÉRATION...' : 'EXPORTER & TÉLÉCHARGER'}
                      </Button>
                      <Button onClick={() => { setImageResult(null); setImagePreview(null); }} size="lg" variant="outline" className="rounded-[32px] h-20 border-white/10 bg-white/5 px-10 hover:bg-white/10 transition-all">
                        <RefreshCcw size={28} />
                      </Button>
                    </motion.div>
                  )}
                  {injectSuccess && <div className="text-emerald-400 text-center font-bold text-sm animate-pulse">✓ SEO Injecté avec succès !</div>}
                </div>
              </div>
            )}

            {section === 'history' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl">
                {historyLoading ? <p className="text-center py-20 text-slate-500">Chargement de votre historique...</p> : 
                 history.length === 0 ? <p className="text-center py-20 text-slate-500">Aucune analyse enregistrée.</p> :
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map(h => (
                      <div key={h.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 hover:border-brand/50 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-brand/10 text-brand border-none text-[10px] font-black uppercase tracking-widest">{h.image_category}</Badge>
                            <span className="text-[10px] font-bold text-slate-500">{new Date(h.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-sm truncate mb-1 group-hover:text-brand transition-colors">{h.image_name}</p>
                        <p className="text-[10px] text-slate-600 mb-6 font-bold">{formatBytes(h.image_size)}</p>
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Score SEO</span>
                            <span className={cn("font-black text-xl", scoreTone(h.seo_score).cls)}>{h.seo_score}%</span>
                        </div>
                      </div>
                    ))}
                 </div>
                }
              </Card>
            )}

            {section === 'tickets' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-5 bg-white/[0.02] border-white/5 rounded-[40px] p-8 shadow-2xl">
                  <h3 className="text-2xl font-black mb-2 tracking-tight">Support Client</h3>
                  <p className="text-sm text-slate-500 mb-8">Une question ? Notre équipe vous répond sous 24h.</p>
                  <Button onClick={() => setShowTicketForm(!showTicketForm)} className="w-full bg-brand rounded-2xl h-14 font-black shadow-lg shadow-brand/10 mb-6">{showTicketForm ? 'ANNULER' : 'OUVRIR UN TICKET'}</Button>
                  
                  {showTicketForm && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <input value={ticketForm.title} onChange={e => setTicketForm({...ticketForm, title: e.target.value})} placeholder="Sujet de votre demande" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 h-14 focus:outline-none focus:ring-1 ring-brand/50 font-bold" />
                      <textarea value={ticketForm.description} onChange={e => setTicketForm({...ticketForm, description: e.target.value})} placeholder="Détaillez votre problème..." rows={5} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:outline-none focus:ring-1 ring-brand/50 resize-none text-sm leading-relaxed" />
                      <select value={ticketForm.priority} onChange={e => setTicketForm({...ticketForm, priority: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 h-14 focus:outline-none text-sm font-bold">
                        <option>Basse</option>
                        <option>Moyenne</option>
                        <option>Haute</option>
                      </select>
                      <Button onClick={async () => {
                         setTicketSubmitting(true);
                         const res = await fetch('/api/tickets', {
                            method: 'POST', headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({...ticketForm, client_email: session?.user?.email, client_name: session?.user?.name})
                         });
                         if(res.ok) { setShowTicketForm(false); fetchData(); }
                         setTicketSubmitting(false);
                      }} disabled={ticketSubmitting} className="w-full bg-white text-black hover:bg-slate-200 rounded-xl h-14 font-black">
                        {ticketSubmitting ? 'ENVOI...' : 'ENVOYER LE TICKET'}
                      </Button>
                    </motion.div>
                  )}
                </Card>
                
                <div className="lg:col-span-7 space-y-4">
                  {ticketsLoading ? <p className="text-center py-10 text-slate-500">Chargement des tickets...</p> : 
                   tickets.length === 0 ? <p className="text-center py-10 text-slate-500 text-sm italic font-medium">Vous n'avez aucun ticket en cours.</p> :
                   tickets.map(t => (
                    <div key={t.id} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/[0.04] transition-all group">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(t.created_at).toLocaleDateString()}</span>
                            <Badge className={cn("bg-transparent border border-white/10 text-[9px] uppercase font-black", t.priority === 'Haute' ? 'text-red-400' : 'text-slate-400')}>{t.priority}</Badge>
                        </div>
                        <p className="font-bold text-lg group-hover:text-brand transition-colors">{t.title}</p>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-1 italic">"{t.description}"</p>
                      </div>
                      <Badge className={cn("bg-transparent border h-10 px-6 rounded-full font-black text-[10px] uppercase tracking-widest", t.status === 'Ouvert' ? 'border-brand text-brand shadow-lg shadow-brand/10' : 'border-emerald-500 text-emerald-500')}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'settings' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[48px] p-8 lg:p-12 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black border-b border-white/5 pb-6 flex items-center gap-3"><UserCircle2 className="text-brand" size={28}/> Mon Compte</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Utilisateur</label>
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 h-14 flex items-center font-bold text-slate-300">{session?.user?.name}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse Email</label>
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 h-14 flex items-center font-bold text-slate-300">{session?.user?.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black border-b border-white/5 pb-6 flex items-center gap-3"><Zap className="text-brand" size={28}/> Configuration IA</h3>
                    <div className="space-y-6">
                      <div className="p-6 bg-brand/5 border border-brand/20 rounded-3xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center text-white"><Sparkles size={18}/></div>
                            <div className="font-black text-sm uppercase tracking-widest">Modèle Vision Premium</div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Votre compte utilise actuellement Claude 3.5 Sonnet pour l'analyse visuelle. C'est le modèle le plus précis au monde pour le SEO.</p>
                      </div>
                      <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-400/5 p-4 rounded-2xl border border-emerald-400/10">
                        <CheckCircle2 size={16}/> Compression WebP Automatique Activée
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
