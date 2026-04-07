'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  FileImage,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCcw,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  Upload,
  UserCircle2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

type Section = 'overview' | 'image-agent' | 'history' | 'tickets' | 'settings'

interface SeoResult {
  detectedContent: string
  suggestedAltText: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  seoScore: number
  improvements: string[]
  imageCategory: string
  tone: string
}

interface AnalysisHistory {
  id: string
  image_name: string | null
  image_size: number | null
  seo_score: number
  alt_text: string
  meta_title: string
  keywords: string[]
  image_category: string
  created_at: string
}

interface TicketItem {
  id: string
  title: string
  description: string
  status: 'Ouvert' | 'En Cours' | 'Fermé'
  priority: 'Haute' | 'Moyenne' | 'Basse'
  created_at: string
  replies?: { id: string }[]
}

const navItems: {
  id: Section
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'image-agent', label: 'Image Agent', icon: FileImage },
  { id: 'history', label: 'History', icon: History },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [section, setSection] = useState<Section>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<SeoResult | null>(null)

  const [history, setHistory] = useState<AnalysisHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Moyenne',
  })
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [ticketError, setTicketError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      const res = await fetch('/api/analyses')
      if (!res.ok) return
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } finally {
      setHistoryLoading(false)
    }
  }

  const fetchTickets = async () => {
    if (!session?.user?.email) return
    try {
      setTicketsLoading(true)
      const res = await fetch(`/api/tickets?email=${encodeURIComponent(session.user.email)}`)
      if (!res.ok) return
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchHistory()
      fetchTickets()
    }
  }, [status])

  const openTicketsCount = useMemo(
    () => tickets.filter((t) => t.status !== 'Fermé').length,
    [tickets]
  )

  const latestScore = history[0]?.seo_score ?? imageResult?.seoScore ?? 0

  const latestHistory = history.slice(0, 3)

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Utilise un fichier image valide.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image trop lourde. Maximum 10MB.')
      return
    }

    setImageError(null)
    setImageResult(null)
    setImageFile(file)

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!imageFile || !imagePreview) return

    try {
      setImageLoading(true)
      setImageError(null)

      const base64 = imagePreview.split(',')[1]

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageFile.type,
          imageName: imageFile.name,
          imageSize: imageFile.size,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setImageError(data?.error || 'Analyse impossible.')
        return
      }

      setImageResult(data)
      setSection('image-agent')
      fetchHistory()
    } catch {
      setImageError('Analyse impossible. Vérifie ta connexion.')
    } finally {
      setImageLoading(false)
    }
  }

  const submitTicket = async () => {
    if (!ticketForm.title.trim() || !ticketForm.description.trim() || !session?.user?.email) {
      return
    }

    try {
      setTicketSubmitting(true)
      setTicketError(null)

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticketForm.title.trim(),
          description: ticketForm.description.trim(),
          priority: ticketForm.priority,
          client_name: session.user.name || 'Client',
          client_email: session.user.email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTicketError(data?.error || 'Erreur lors de la création du ticket.')
        return
      }

      setTicketForm({ title: '', description: '', priority: 'Moyenne' })
      setShowTicketForm(false)
      fetchTickets()
      setSection('tickets')
    } catch {
      setTicketError('Connexion impossible.')
    } finally {
      setTicketSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-2xl border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement du dashboard…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  const desktopSidebar = (
    <aside
      className={cn(
        'hidden border-r border-white/10 bg-background/40 backdrop-blur-2xl lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0',
        sidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand shadow-[0_0_30px_hsl(22_82%_55%/0.35)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                Seo<span className="text-brand">Pic</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Client Dashboard</p>
            </div>
          </Link>
        )}

        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-5 rounded-2xl border border-brand/20 bg-brand/10 p-4">
          {!sidebarCollapsed ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                  Plan
                </span>
                <Badge variant="outline" className="border-brand/20 text-brand">
                  Découverte
                </Badge>
              </div>
              <p className="text-sm font-semibold">Espace client réel</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Image Agent, historique, tickets et réglages.
              </p>
            </>
          ) : (
            <div className="flex justify-center">
              <Sparkles className="h-5 w-5 text-brand" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                  active
                    ? 'border border-brand/20 bg-brand/12 text-brand'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.id === 'tickets' && openTicketsCount > 0 && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                        {openTicketsCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-brand/40"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand/40 to-orange-400/20 font-bold text-white">
              {getInitials(session?.user?.name)}
            </div>
          )}

          {!sidebarCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{session?.user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute right-0 top-24 h-[260px] w-[260px] rounded-full bg-orange-400/10 blur-[110px]" />
      </div>

      <div className="relative flex min-h-screen">
        {desktopSidebar}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-background/55 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                    {section === 'overview' && 'Overview'}
                    {section === 'image-agent' && 'Image Agent'}
                    {section === 'history' && 'History'}
                    {section === 'tickets' && 'Tickets'}
                    {section === 'settings' && 'Settings'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Dashboard client réel. Seulement les sections branchées.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    fetchHistory()
                    fetchTickets()
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </div>
          </header>

          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 lg:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.aside
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ duration: 0.25 }}
                  className="fixed left-0 top-0 z-50 h-screen w-[290px] border-r border-white/10 bg-background/90 p-4 backdrop-blur-2xl lg:hidden"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-black tracking-tight">
                          Seo<span className="text-brand">Pic</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">Client</p>
                      </div>
                    </Link>

                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const active = section === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSection(item.id)
                            setMobileMenuOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                            active
                              ? 'border border-brand/20 bg-brand/12 text-brand'
                              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-5">
                    <Button asChild variant="outline" className="mb-2 w-full rounded-2xl">
                      <Link href="/">
                        <Home className="mr-2 h-4 w-4" />
                        Accueil
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    >
                      Se déconnecter
                    </Button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            {section === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: 'Dernier score SEO',
                      value: latestScore ? String(latestScore) : '—',
                      sub: latestScore ? scoreTone(latestScore).label : 'Aucune analyse',
                      icon: BarChart3,
                    },
                    {
                      label: 'Analyses enregistrées',
                      value: String(history.length),
                      sub: 'Historique disponible',
                      icon: History,
                    },
                    {
                      label: 'Tickets ouverts',
                      value: String(openTicketsCount),
                      sub: 'Support client',
                      icon: Ticket,
                    },
                    {
                      label: 'Image Agent',
                      value: imageResult ? 'Actif' : 'Prêt',
                      sub: imageResult ? 'Dernière analyse en mémoire' : 'Aucune image chargée',
                      icon: FileImage,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <Card key={item.label} className="rounded-[28px] border-white/10 bg-card/60 backdrop-blur-xl">
                        <CardContent className="p-6">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                            <Icon className="h-5 w-5 text-brand" />
                          </div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-4xl font-black tracking-tight">{item.value}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{item.sub}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle>Accès rapide</CardTitle>
                      <CardDescription>Les sections qui fonctionnent vraiment.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          title: 'Image Agent',
                          desc: 'Uploader une image, analyser et récupérer le résultat SEO.',
                          section: 'image-agent' as Section,
                          icon: FileImage,
                        },
                        {
                          title: 'History',
                          desc: 'Consulter les dernières analyses enregistrées.',
                          section: 'history' as Section,
                          icon: History,
                        },
                        {
                          title: 'Tickets',
                          desc: 'Créer un ticket et suivre les demandes support.',
                          section: 'tickets' as Section,
                          icon: Ticket,
                        },
                        {
                          title: 'Settings',
                          desc: 'Compte, navigation et accès admin si autorisé.',
                          section: 'settings' as Section,
                          icon: Settings,
                        },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.title}
                            onClick={() => setSection(item.section)}
                            className="rounded-[24px] border border-white/10 bg-background/45 p-5 text-left transition hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                          >
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                              <Icon className="h-5 w-5 text-brand" />
                            </div>
                            <h3 className="text-lg font-bold">{item.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                          </button>
                        )
                      })}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle>Dernières analyses</CardTitle>
                      <CardDescription>Lecture rapide sans texte inutile.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {latestHistory.length === 0 ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/10 bg-background/40 p-8 text-center">
                          <div>
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                              <History className="h-6 w-6 text-brand" />
                            </div>
                            <p className="text-lg font-bold">Aucune analyse</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Lance une analyse image pour commencer.
                            </p>
                          </div>
                        </div>
                      ) : (
                        latestHistory.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="truncate text-base font-bold">
                                  {item.image_name || 'Sans nom'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(item.created_at)} · {formatBytes(item.image_size)}
                                </p>
                              </div>
                              <Badge variant="outline" className="border-brand/20 text-brand">
                                {item.image_category || 'Image'}
                              </Badge>
                            </div>

                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Score</span>
                              <span className={cn('text-sm font-bold', scoreTone(item.seo_score).cls)}>
                                {item.seo_score}/100
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn('h-full rounded-full', scoreTone(item.seo_score).bar)}
                                style={{ width: `${item.seo_score}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {section === 'image-agent' && (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Image Agent</CardTitle>
                    <CardDescription>
                      Upload image → analyse → résultat.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!imagePreview ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex min-h-[280px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-background/40 p-8 text-center transition hover:border-brand/30 hover:bg-brand/5"
                      >
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand/12">
                          <Upload className="h-7 w-7 text-brand" />
                        </div>
                        <h3 className="text-lg font-bold">Ajouter une image</h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                          JPG, PNG, WEBP ou GIF. Maximum 10MB.
                        </p>
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-background/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-[280px] w-full object-cover"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={analyzeImage}
                            disabled={imageLoading}
                            className="rounded-full"
                            variant="brand"
                          >
                            {imageLoading ? 'Analyse en cours…' : 'Lancer l’analyse'}
                          </Button>
                          <Button
                            onClick={() => {
                              setImagePreview(null)
                              setImageFile(null)
                              setImageResult(null)
                              setImageError(null)
                            }}
                            variant="outline"
                            className="rounded-full"
                          >
                            Réinitialiser
                          </Button>
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageFile(file)
                      }}
                    />

                    {imageError && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                        {imageError}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Résultat</CardTitle>
                    <CardDescription>
                      Sortie réelle de `/api/analyze`.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!imageResult ? (
                      <div className="flex min-h-[380px] items-center justify-center rounded-[28px] border border-white/10 bg-background/40 p-8 text-center">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                            <FileImage className="h-6 w-6 text-brand" />
                          </div>
                          <h3 className="text-lg font-bold">Aucun résultat</h3>
                          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            Charge une image puis lance l’analyse.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">Score SEO</span>
                            <span className={cn('text-sm font-bold', scoreTone(imageResult.seoScore).cls)}>
                              {imageResult.seoScore}/100 · {scoreTone(imageResult.seoScore).label}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn('h-full rounded-full', scoreTone(imageResult.seoScore).bar)}
                              style={{ width: `${imageResult.seoScore}%` }}
                            />
                          </div>
                        </div>

                        <InfoCard label="Alt text" value={imageResult.suggestedAltText} />
                        <InfoCard label="Meta title" value={imageResult.metaTitle} />
                        <InfoCard label="Meta description" value={imageResult.metaDescription} />

                        <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Mots-clés
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {imageResult.keywords.map((k) => (
                              <span
                                key={k}
                                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Améliorations
                          </p>
                          <ul className="mt-3 space-y-2">
                            {imageResult.improvements.map((item, idx) => (
                              <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === 'history' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>History</CardTitle>
                    <CardDescription>Dernières analyses enregistrées.</CardDescription>
                  </div>
                  <Button onClick={fetchHistory} variant="outline" className="rounded-full">
                    Actualiser
                  </Button>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">Chargement…</div>
                  ) : history.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                        <History className="h-6 w-6 text-brand" />
                      </div>
                      <p className="text-lg font-bold">Aucune analyse enregistrée</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Lance une analyse dans Image Agent.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <Badge variant="outline" className="border-brand/20 text-brand">
                              {item.image_category || 'Image'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          <p className="truncate text-base font-bold">
                            {item.image_name || 'Sans nom'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatBytes(item.image_size)}
                          </p>
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Score</span>
                              <span className={cn('text-sm font-bold', scoreTone(item.seo_score).cls)}>
                                {item.seo_score}/100
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn('h-full rounded-full', scoreTone(item.seo_score).bar)}
                                style={{ width: `${item.seo_score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {section === 'tickets' && (
              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Créer un ticket</CardTitle>
                    <CardDescription>Support client réel.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => setShowTicketForm((v) => !v)}
                      variant="brand"
                      className="rounded-full"
                    >
                      {showTicketForm ? 'Fermer' : 'Nouveau ticket'}
                    </Button>

                    <AnimatePresence>
                      {showTicketForm && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 12 }}
                          className="space-y-3 rounded-[24px] border border-white/10 bg-background/45 p-4"
                        >
                          <input
                            value={ticketForm.title}
                            onChange={(e) => setTicketForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Titre"
                            className="h-12 w-full rounded-2xl border border-white/10 bg-background/60 px-4 text-sm outline-none transition focus:border-brand/30"
                          />
                          <textarea
                            value={ticketForm.description}
                            onChange={(e) =>
                              setTicketForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="Décris le problème"
                            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-brand/30"
                          />
                          <select
                            value={ticketForm.priority}
                            onChange={(e) =>
                              setTicketForm((prev) => ({ ...prev, priority: e.target.value }))
                            }
                            className="h-12 w-full rounded-2xl border border-white/10 bg-background/60 px-4 text-sm outline-none transition focus:border-brand/30"
                          >
                            <option>Moyenne</option>
                            <option>Haute</option>
                            <option>Basse</option>
                          </select>

                          {ticketError && (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                              {ticketError}
                            </div>
                          )}

                          <Button
                            onClick={submitTicket}
                            disabled={ticketSubmitting}
                            variant="brand"
                            className="rounded-full"
                          >
                            {ticketSubmitting ? 'Envoi…' : 'Envoyer'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle>Mes tickets</CardTitle>
                      <CardDescription>Demandes envoyées depuis l’espace client.</CardDescription>
                    </div>
                    <Button onClick={fetchTickets} variant="outline" className="rounded-full">
                      Actualiser
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {ticketsLoading ? (
                      <div className="py-16 text-center text-sm text-muted-foreground">Chargement…</div>
                    ) : tickets.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                          <Ticket className="h-6 w-6 text-brand" />
                        </div>
                        <p className="text-lg font-bold">Aucun ticket</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Crée ton premier ticket si besoin.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                          >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={statusTone(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline" className={priorityTone(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(ticket.created_at)}
                              </span>
                            </div>
                            <p className="text-base font-bold">{ticket.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {ticket.description}
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                              Réponses : {ticket.replies?.length || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === 'settings' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Compte et navigation.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <UserCircle2 className="h-5 w-5 text-brand" />
                      <p className="font-semibold">Compte</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{session?.user?.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{session?.user?.email}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <Home className="h-5 w-5 text-brand" />
                      <p className="font-semibold">Navigation</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="rounded-full">
                        <Link href="/">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Retour landing
                        </Link>
                      </Button>
                      {isAdmin && (
                        <Button asChild variant="outline" className="rounded-full">
                          <Link href="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5 md:col-span-2">
                    <div className="mb-3 flex items-center gap-3">
                      <Shield className="h-5 w-5 text-brand" />
                      <p className="font-semibold">État actuel</p>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Cette version du dashboard n’affiche que les modules réellement branchés : Image Agent, History, Tickets et Settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{value}</p>
    </div>
  )
}
