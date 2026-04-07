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

// --- CONFIG & TYPES ---
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

// --- HELPERS ---
function formatBytes(bytes?: number | null) {
  if (!bytes) return '—'
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function scoreTone(score: number) {
  if (score >= 80) return { label: 'Excellent', cls: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 60) return { label: 'Correct', cls: 'text-yellow-400', bar: 'bg-yellow-400' }
  return { label: 'À améliorer', cls: 'text-red-400', bar: 'bg-red-400' }
}

// --- UI COMPONENTS ---
function CircularScore({ score }: { score: number }) {
  const radius = 35; const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const tone = scoreTone(score)
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
        <motion.circle initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: progress }} transition={{ duration: 1.5 }}
          cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} className={cn(tone.cls)} />
      </svg>
      <span className="absolute text-xl font-black">{score}</span>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon }: any) {
  return (
    <Card className="rounded-[28px] border-white/5 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon size={20} /></div>
      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className={cn("mt-1 text-xs font-medium", sub.includes('Excellent') ? 'text-emerald-400' : 'text-muted-foreground')}>{sub}</p>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- STATES (Toutes tes fonctionnalités gardées) ---
  const [section, setSection] = useState<Section>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResult, setImageResult] = useState<SeoResult | null>(null)
  
  const [seoFilename, setSeoFilename] = useState(''); const [seoTitle, setSeoTitle] = useState('')
  const [seoAltText, setSeoAltText] = useState(''); const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]); const [keywordInput, setKeywordInput] = useState('')
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp'>('jpg'); const [outputQuality, setOutputQuality] = useState(85)
  
  const [history, setHistory] = useState<AnalysisHistory[]>([]); const [historyLoading, setHistoryLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketItem[]>([]); const [ticketsLoading, setTicketsLoading] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false); const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'Moyenne' })

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  // --- LOGIC (Récupération des données) ---
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/signin') }, [status])

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
    } finally { setHistoryLoading(false); setTicketsLoading(false) }
  }

  useEffect(() => { fetchData() }, [status])

  // --- HANDLERS (Image Agent) ---
  const handleImageFile = (file: File) => {
    const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file); setImageFile(file); setImageResult(null)
  }

  const analyzeImage = async () => {
    if (!imagePreview) return
    setImageLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview.split(',')[1], mimeType: imageFile?.type, imageName: imageFile?.name, imageSize: imageFile?.size }),
      })
      const data = await res.json()
      if (res.ok) {
        setImageResult(data)
        setSeoFilename(data.metaTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'image-seo')
        setSeoTitle(data.metaTitle || ''); setSeoAltText(data.suggestedAltText || '')
        setSeoDescription(data.metaDescription || ''); setSeoKeywords(data.keywords || [])
        fetchData()
      }
    } finally { setImageLoading(false) }
  }

  const injectAndDownload = async () => {
    if (!imagePreview) return
    try {
      const res = await fetch('/api/inject-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview.split(',')[1], filename: seoFilename, title: seoTitle, altText: seoAltText, description: seoDescription, keywords: seoKeywords, format: outputFormat, quality: outputQuality }),
      })
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${seoFilename}.${outputFormat}`
        document.body.appendChild(a); a.click(); a.remove()
      }
    } catch (e) { console.error(e) }
  }

  if (status === 'loading') return <div className="h-screen flex items-center justify-center bg-black text-white font-bold">Chargement...</div>

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {/* EFFETS VISUELS DE FOND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-orange-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative flex min-h-screen">
        {/* SIDEBAR */}
        <aside className={cn("sticky top-0 h-screen border-r border-white/5 bg-black/40 backdrop-blur-2xl transition-all duration-300 z-50", sidebarCollapsed ? "w-20" : "w-72")}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-10">
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
                <button key={item.id} onClick={() => setSection(item.id as Section)} className={cn("flex items-center gap-3 w-full p-3 rounded-xl transition-all", section === item.id ? "bg-brand/10 text-brand border border-brand/20 shadow-inner" : "text-slate-400 hover:bg-white/5")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-full bg-brand/20 flex-shrink-0 border border-brand/40 overflow-hidden">
                {session?.user?.image ? <img src={session.user.image} alt="User" /> : <div className="w-full h-full flex items-center justify-center font-bold">{session?.user?.name?.[0]}</div>}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{session?.user?.name}</p>
                  <button onClick={() => signOut()} className="text-[10px] text-slate-500 hover:text-brand flex items-center gap-1 transition-colors"><LogOut size={10} /> Déconnexion</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <header className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                {section === 'overview' && 'Dashboard'}
                {section === 'image-agent' && 'Image Agent AI'}
                {section === 'history' && 'Historique des analyses'}
                {section === 'tickets' && 'Support Client'}
                {section === 'settings' && 'Paramètres'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">Gérez votre optimisation SEO visuelle en un clic.</p>
            </div>
            <div className="flex gap-3">
              {isAdmin && <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/5"><Link href="/admin"><Shield size={16} className="mr-2"/> Admin</Link></Button>}
              <Button onClick={fetchData} variant="outline" className="rounded-xl border-white/10 bg-white/5 h-10 w-10 p-0"><RefreshCcw size={16} /></Button>
            </div>
          </header>

          {/* RENDU DES SECTIONS */}
          <div className="animate-in fade-in duration-500">
            {section === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Dernier score" value={history[0]?.seo_score || '—'} sub={history[0] ? scoreTone(history[0].seo_score).label : 'Aucune donnée'} icon={BarChart3} />
                  <StatCard label="Total Analyses" value={history.length} sub="Toutes images confondues" icon={History} />
                  <StatCard label="Tickets Actifs" value={tickets.filter(t => t.status !== 'Fermé').length} sub="En attente de réponse" icon={Ticket} />
                  <StatCard label="Mode IA" value="Claude 3.5" sub="Excellent Vision" icon={Zap} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 bg-white/[0.02] border-white/5 rounded-[32px] p-8">
                    <CardTitle className="mb-6">Dernières activités</CardTitle>
                    <div className="space-y-4">
                      {history.slice(0, 4).map(h => (
                        <div key={h.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-brand/10 rounded-lg flex items-center justify-center text-brand"><ImageIcon size={20} /></div>
                            <div>
                              <p className="text-sm font-bold truncate max-w-[200px]">{h.image_name}</p>
                              <p className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={cn("bg-transparent border border-white/10", scoreTone(h.seo_score).cls)}>{h.seo_score}/100</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="bg-brand border-none rounded-[32px] p-8 text-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-black mb-2 leading-tight">Prêt à optimiser <br/>votre SEO ?</h3>
                      <p className="text-white/70 text-sm">Gagnez du temps avec notre Agent Image basé sur l'IA.</p>
                    </div>
                    <Button onClick={() => setSection('image-agent')} className="bg-white text-black hover:bg-slate-100 rounded-2xl h-14 font-bold shadow-xl">Démarrer maintenant</Button>
                  </Card>
                </div>
              </div>
            )}

            {section === 'image-agent' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* COLONNE PREVIEW (STICKY) */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
                  <div className="relative aspect-square rounded-[40px] border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center group shadow-2xl">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" alt="Preview" />
                        {imageLoading && (
                          <motion.div initial={{ top: "-10%" }} animate={{ top: "110%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[3px] bg-brand shadow-[0_0_25px_#e76f2e] z-20" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" className="rounded-xl font-bold" onClick={() => fileInputRef.current?.click()}>Changer</Button>
                        </div>
                      </>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer p-12 text-center group">
                        <div className="h-20 w-20 bg-brand/10 rounded-[28px] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300">
                          <Upload className="text-brand h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-black mb-2 tracking-tight">Importez un visuel</h3>
                        <p className="text-slate-500 text-sm max-w-[200px]">PNG, JPG ou WebP jusqu'à 10MB</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                  </div>

                  {imageResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 flex items-center justify-between shadow-xl">
                      <div><span className="text-brand font-black text-[10px] uppercase tracking-[0.2em]">SEO Score</span><h3 className="text-2xl font-black mt-1">{scoreTone(imageResult.seoScore).label}</h3></div>
                      <CircularScore score={imageResult.seoScore} />
                    </motion.div>
                  )}

                  {!imageResult && imagePreview && (
                    <Button onClick={analyzeImage} disabled={imageLoading} size="lg" className="w-full rounded-[24px] h-16 bg-brand hover:bg-brand/90 text-lg font-black shadow-lg shadow-brand/20 transition-all hover:-translate-y-1">
                      {imageLoading ? 'Analyse IA en cours...' : <><Wand2 className="mr-2 h-6 w-6" /> Analyser avec l'IA</>}
                    </Button>
                  )}
                </div>

                {/* COLONNE FORMULAIRE */}
                <div className="lg:col-span-7 space-y-6">
                  <Card className="bg-white/[0.03] border-white/10 rounded-[40px] p-8 lg:p-10 shadow-2xl">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nom du fichier final</label>
                        <div className="flex group">
                          <input type="text" value={seoFilename} onChange={(e) => setSeoFilename(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-l-2xl px-5 h-14 focus:outline-none focus:border-brand/50 transition-all font-medium" />
                          <div className="bg-white/10 border border-l-0 border-white/10 rounded-r-2xl px-5 flex items-center text-slate-400 font-mono text-xs italic">.{outputFormat}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Balise Alt Text</label><Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] uppercase">SEO Booster</Badge></div>
                        <textarea value={seoAltText} onChange={(e) => setSeoAltText(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-brand/50 transition-all resize-none font-medium leading-relaxed" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Meta Description</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-brand/50 transition-all resize-none text-sm text-slate-400" />
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 text-center">Aperçu du résultat Google</p>
                        <div className="bg-white rounded-[24px] p-6 shadow-2xl border border-slate-200">
                          <div className="text-[#1a0dab] text-xl font-medium truncate mb-1">{seoTitle || 'Titre SEO de l\'image'}</div>
                          <div className="text-[#006621] text-xs mb-2 truncate">https://votre-site.io › images › {seoFilename}</div>
                          <div className="text-[#4d5156] text-sm line-clamp-2 leading-relaxed">{seoDescription || 'La description optimisée s\'affichera ici pour augmenter votre visibilité sur les moteurs de recherche.'}</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {imageResult && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={injectAndDownload} size="lg" className="flex-1 rounded-2xl h-16 bg-white text-black hover:bg-slate-200 font-black text-lg shadow-xl transition-all hover:-translate-y-1"><Download className="mr-2 h-6 w-6" /> Exporter & Télécharger</Button>
                      <Button onClick={() => { setImageResult(null); setImagePreview(null); }} size="lg" variant="outline" className="rounded-2xl h-16 border-white/10 bg-white/5 px-8 hover:bg-white/10"><RefreshCcw /></Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'history' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-8 lg:p-10 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.length === 0 ? <p className="text-center col-span-full py-20 text-slate-500">Aucun historique disponible.</p> : history.map(h => (
                    <div key={h.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 hover:border-brand/40 transition-all">
                      <div className="flex justify-between items-start mb-4"><Badge className="bg-brand/10 text-brand border-none text-[10px]">{h.image_category}</Badge><span className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString()}</span></div>
                      <p className="font-bold text-sm truncate mb-1">{h.image_name}</p>
                      <p className="text-[10px] text-slate-500 mb-4">{formatBytes(h.image_size)}</p>
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Score SEO</span><span className={cn("font-black text-lg", scoreTone(h.seo_score).cls)}>{h.seo_score}%</span></div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {section === 'tickets' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-5 bg-white/[0.02] border-white/5 rounded-[32px] p-8">
                  <h3 className="text-xl font-bold mb-4">Besoin d'aide ?</h3>
                  <p className="text-sm text-slate-500 mb-6">Nos experts vous répondent en moins de 24h.</p>
                  <Button onClick={() => setShowTicketForm(!showTicketForm)} className="w-full bg-brand rounded-2xl h-12 font-bold mb-4">{showTicketForm ? 'Annuler' : 'Nouveau ticket'}</Button>
                  
                  {showTicketForm && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                      <input value={ticketForm.title} onChange={e => setTicketForm({...ticketForm, title: e.target.value})} placeholder="Sujet" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-12 focus:outline-none focus:border-brand/50" />
                      <textarea value={ticketForm.description} onChange={e => setTicketForm({...ticketForm, description: e.target.value})} placeholder="Détails..." rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand/50 resize-none" />
                      <Button className="w-full bg-white text-black hover:bg-slate-200 rounded-xl font-bold">Envoyer le ticket</Button>
                    </div>
                  )}
                </Card>
                
                <div className="lg:col-span-7 space-y-4">
                  {tickets.length === 0 ? <p className="text-center py-10 text-slate-500">Aucun ticket ouvert.</p> : tickets.map(t => (
                    <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex justify-between items-center">
                      <div><p className="font-bold">{t.title}</p><p className="text-xs text-slate-500 mt-1">{t.description.substring(0, 60)}...</p></div>
                      <Badge className={cn("bg-transparent border", t.status === 'Ouvert' ? 'border-brand text-brand' : 'border-emerald-500 text-emerald-500')}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'settings' && (
              <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-10 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b border-white/5 pb-4 flex items-center gap-2"><UserCircle2 className="text-brand"/> Mon Profil</h3>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                      <div className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 flex items-center text-sm">{session?.user?.name}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                      <div className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 flex items-center text-sm">{session?.user?.email}</div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b border-white/5 pb-4 flex items-center gap-2"><Zap className="text-brand"/> Préférences IA</h3>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Modèle par défaut</label>
                      <div className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 flex items-center text-sm font-mono">Claude 3.5 Sonnet (Vision)</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Optimisation Automatique</label>
                      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold"><CheckCircle2 size={14}/> Activé (Compression WebP incluse)</div>
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
