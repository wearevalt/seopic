'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, CheckCircle2, Download, FileImage, History, LayoutDashboard, 
  LogOut, RefreshCcw, Settings, Shield, Sparkles, Ticket, Upload, Wand2, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// --- CONFIG ---
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim())
type Section = 'overview' | 'image-agent' | 'history' | 'tickets' | 'settings'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // -- States --
  const [section, setSection] = useState<Section>('image-agent') // Par défaut sur l'outil
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResult, setImageResult] = useState<any>(null)
  
  // -- Champs SEO --
  const [seoFilename, setSeoFilename] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoAltText, setSeoAltText] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/signin') }, [status])

  // --- LOGIQUE ANALYSE (FIX 400 ERROR) ---
  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setImageFile(file)
  }

  const analyzeImage = async () => {
    if (!imagePreview || !imageFile) return
    setImageLoading(true)
    try {
      // Nettoyage du Base64 pour éviter les erreurs 400
      const base64Data = imagePreview.split(',')[1]
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: imageFile.type,
          imageName: imageFile.name,
          imageSize: imageFile.size // On envoie bien tous les champs du schéma
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setImageResult(data)
        setSeoFilename(data.metaTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'image-seo')
        setSeoTitle(data.metaTitle || '')
        setSeoAltText(data.suggestedAltText || '')
        setSeoDescription(data.metaDescription || '')
      } else {
        console.error("Erreur Backend:", data.error)
      }
    } catch (err) {
      console.error("Erreur Client:", err)
    } finally {
      setImageLoading(false)
    }
  }

  if (status === 'loading') return <div className="h-screen flex items-center justify-center bg-black text-white">Chargement...</div>

  return (
    <div className="min-h-screen bg-[#030303] text-slate-200 font-sans selection:bg-brand/30">
      {/* Background Glows (Landing Vibe) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar flottante Premium */}
        <aside className="w-24 lg:w-72 border-r border-white/5 bg-black/40 backdrop-blur-2xl p-6 flex flex-col gap-10 z-50">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(231,111,46,0.3)]">
              <Sparkles className="text-white h-5 w-5" />
            </div>
            <span className="hidden lg:block text-xl font-black tracking-tighter uppercase">Seo<span className="text-brand">Pic</span></span>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'image-agent', icon: Zap, label: 'Image Agent' },
              { id: 'history', icon: History, label: 'Historique' },
              { id: 'tickets', icon: Ticket, label: 'Tickets' },
              { id: 'settings', icon: Settings, label: 'Paramètres' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id as Section)}
                className={cn(
                  "flex items-center gap-4 w-full p-4 rounded-2xl transition-all group",
                  section === item.id ? "bg-brand text-white shadow-lg" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-2 border-t border-white/5 pt-6">
            <button onClick={() => signOut()} className="flex items-center gap-4 text-slate-500 hover:text-red-400 transition-colors w-full">
              <LogOut size={20} />
              <span className="hidden lg:block font-bold text-sm">Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Contenu Principal */}
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-40 bg-[#030303]/80 backdrop-blur-md border-b border-white/5 px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight tracking-wide">
                {section === 'image-agent' ? 'IMAGE AGENT AI' : section.toUpperCase()}
              </h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Plateforme d'optimisation SEO</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-sm font-bold">{session?.user?.name}</span>
                <span className="text-[10px] text-brand font-bold uppercase">Plan Découverte</span>
              </div>
              <div className="h-10 w-10 rounded-full border border-brand/50 bg-brand/10 flex items-center justify-center font-bold text-brand">
                {session?.user?.name?.[0]}
              </div>
            </div>
          </header>

          <div className="p-8 max-w-[1600px] mx-auto">
            {section === 'image-agent' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* COLONNE GAUCHE : LE VISUEL ET LE SCORE */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="relative aspect-square rounded-[40px] border border-white/10 bg-white/[0.02] overflow-hidden group shadow-inner">
                    {imagePreview ? (
                      <div className="relative h-full w-full p-4">
                        <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                        {imageLoading && (
                          <motion.div 
                            initial={{ top: "-5%" }} 
                            animate={{ top: "105%" }} 
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[2px] bg-brand shadow-[0_0_20px_#e76f2e] z-10" 
                          />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Button variant="secondary" className="rounded-2xl px-8 font-bold" onClick={() => fileInputRef.current?.click()}>Changer l'image</Button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="h-full flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
                        <div className="h-24 w-24 bg-brand/10 rounded-[32px] flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:bg-brand/20">
                          <Upload className="text-brand h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-black mb-2 tracking-tight">Importer un visuel</h2>
                        <p className="text-slate-500 text-sm max-w-xs">Optimisez vos balises Alt et descriptions instantanément.</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                  </div>

                  {imageResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest mb-2">Score SEO</span>
                        <div className="text-4xl font-black text-emerald-400">{imageResult.seoScore}%</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Format</span>
                        <div className="text-xl font-black uppercase">{imageFile?.type.split('/')[1]}</div>
                      </div>
                    </motion.div>
                  )}

                  {!imageResult && imagePreview && (
                    <Button onClick={analyzeImage} disabled={imageLoading} className="w-full h-20 rounded-[28px] bg-brand hover:bg-brand/90 text-xl font-black shadow-2xl shadow-brand/20">
                      {imageLoading ? 'Analyse par IA...' : <><Wand2 className="mr-3 h-6 w-6" /> GÉNÉRER LE SEO</>}
                    </Button>
                  )}
                </div>

                {/* COLONNE DROITE : L'ÉDITEUR PRODUCTIF */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 lg:p-10">
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nom du fichier</label>
                          <input type="text" value={seoFilename} onChange={(e) => setSeoFilename(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 px-6 focus:ring-2 ring-brand/50 outline-none transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Titre SEO</label>
                          <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 px-6 focus:ring-2 ring-brand/50 outline-none transition-all font-medium" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Texte Alternatif (ALT TAG)</label>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-black">CRUCIAL</Badge>
                        </div>
                        <textarea value={seoAltText} onChange={(e) => setSeoAltText(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 focus:ring-2 ring-brand/50 outline-none transition-all resize-none leading-relaxed" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Meta Description</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 focus:ring-2 ring-brand/50 outline-none transition-all resize-none text-slate-400 text-sm" />
                      </div>

                      {/* Google Search Simulation (L'aspect productif) */}
                      <div className="pt-8 border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 text-center">Aperçu du résultat Google Search</p>
                        <div className="bg-white rounded-[32px] p-8 shadow-2xl max-w-2xl mx-auto border border-slate-200">
                          <div className="text-[#1a0dab] text-xl font-medium truncate mb-1">{seoTitle || 'Titre SEO de votre page'}</div>
                          <div className="text-[#006621] text-xs mb-2 truncate">https://votre-site.com › images › {seoFilename || 'nom-image'}</div>
                          <div className="text-[#4d5156] text-sm line-clamp-2 leading-relaxed">
                            {seoDescription || 'La meta description optimisée apparaîtra ici. Elle aide à convaincre les utilisateurs de cliquer sur votre lien.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {imageResult && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={() => {}} size="lg" className="flex-1 rounded-[24px] h-20 bg-white text-black hover:bg-slate-200 font-black text-xl shadow-xl transition-transform hover:-translate-y-1">
                        <Download className="mr-3 h-6 w-6" /> TÉLÉCHARGER
                      </Button>
                      <Button onClick={() => { setImageResult(null); setImagePreview(null); }} size="lg" variant="outline" className="rounded-[24px] h-20 border-white/10 bg-white/5 px-10 hover:bg-white/10 transition-all">
                        <RefreshCcw size={24} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
