'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  Crown,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  Users,
  UserCircle2,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

type AdminSection =
  | 'overview'
  | 'tickets'
  | 'clients'
  | 'messages'
  | 'team'
  | 'settings'

type TicketItem = {
  id: string
  title: string
  description: string
  status?: 'Ouvert' | 'En Cours' | 'Fermé'
  priority?: 'Haute' | 'Moyenne' | 'Basse'
  created_at?: string
  client_email?: string
  client_name?: string
  replies?: {
    id: string
    message?: string
    author?: string
    created_at?: string
  }[]
}

const navItems: {
  id: AdminSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'team', label: 'Équipe VALT', icon: Building2 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: i * 0.05, ease: 'easeOut' as const },
  }),
}

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

function statusTone(status?: string) {
  if (status === 'Fermé') return 'border-emerald-500/20 text-emerald-400'
  if (status === 'En Cours') return 'border-yellow-500/20 text-yellow-400'
  return 'border-brand/20 text-brand'
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [section, setSection] = useState<AdminSection>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketSearch, setTicketSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchTickets()
    }
  }, [status, isAdmin])

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true)
      const res = await fetch('/api/tickets')
      if (!res.ok) return
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } finally {
      setTicketsLoading(false)
    }
  }

  const submitReply = async () => {
    if (!selectedTicket?.id || !replyText.trim()) return

    try {
      setReplyLoading(true)
      setReplyError(null)

      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          author: session?.user?.name || 'Admin',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setReplyError(data?.error || 'Réponse impossible.')
        return
      }

      setReplyText('')
      await fetchTickets()

      const refreshed = tickets.find((t) => t.id === selectedTicket.id)
      if (refreshed) setSelectedTicket(refreshed)
    } catch {
      setReplyError('Connexion impossible.')
    } finally {
      setReplyLoading(false)
    }
  }

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter((t) =>
      [t.title, t.description, t.client_email, t.client_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [tickets, ticketSearch])

  const clients = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string
        name: string
        tickets: number
        open: number
        lastDate?: string
      }
    >()

    tickets.forEach((ticket) => {
      const email = ticket.client_email || 'unknown@client.com'
      const name = ticket.client_name || 'Client'
      const current = map.get(email) || {
        email,
        name,
        tickets: 0,
        open: 0,
        lastDate: ticket.created_at,
      }

      current.tickets += 1
      if (ticket.status !== 'Fermé') current.open += 1
      if (ticket.created_at && (!current.lastDate || ticket.created_at > current.lastDate)) {
        current.lastDate = ticket.created_at
      }

      map.set(email, current)
    })

    return Array.from(map.values()).sort((a, b) => b.tickets - a.tickets)
  }, [tickets])

  const messages = useMemo(() => {
    return tickets.flatMap((ticket) =>
      (ticket.replies || []).map((reply) => ({
        id: reply.id,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        author: reply.author || 'Support',
        message: reply.message || '—',
        created_at: reply.created_at,
      }))
    )
  }, [tickets])

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'Fermé').length
    const noReply = tickets.filter((t) => !t.replies || t.replies.length === 0).length
    return {
      totalTickets: tickets.length,
      openTickets: open,
      clients: clients.length,
      noReply,
      messages: messages.length,
    }
  }, [tickets, clients, messages])

  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find((t) => t.id === selectedTicket.id)
      if (fresh) setSelectedTicket(fresh)
    }
  }, [tickets, selectedTicket])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-2xl border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement de l’admin…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-lg rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/12">
              <Shield className="h-7 w-7 text-brand" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Accès administrateur requis</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Ce dashboard est réservé aux comptes admin autorisés.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/dashboard">Retour espace client</Link>
              </Button>
              <Button asChild variant="brand" className="rounded-full">
                <Link href="/">Accueil</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <p className="text-[11px] text-muted-foreground">Admin Control Center</p>
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
                  Admin
                </span>
                <Badge variant="outline" className="border-brand/20 text-brand">
                  VALT
                </Badge>
              </div>
              <p className="text-sm font-semibold">Pilotage plateforme</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tickets, clients, messages, équipe et supervision globale.
              </p>
            </>
          ) : (
            <div className="flex justify-center">
              <Crown className="h-5 w-5 text-brand" />
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
                    ? 'bg-brand/12 text-brand border border-brand/20'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.id === 'tickets' && stats.openTickets > 0 && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                        {stats.openTickets}
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                      {section === 'overview' && 'Dashboard Admin'}
                      {section === 'tickets' && 'Gestion des tickets'}
                      {section === 'clients' && 'Clients'}
                      {section === 'messages' && 'Messages'}
                      {section === 'team' && 'Équipe VALT'}
                      {section === 'settings' && 'Paramètres admin'}
                    </h1>
                    <Badge variant="outline" className="border-brand/20 text-brand">
                      Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Centre de contrôle Seopic · tickets, clients et supervision plateforme.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Espace client
                  </Link>
                </Button>
                <Button onClick={fetchTickets} variant="outline" className="rounded-full">
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
                        <p className="text-[11px] text-muted-foreground">Admin</p>
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
                              ? 'bg-brand/12 text-brand border border-brand/20'
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
                      <Link href="/dashboard">Retour espace client</Link>
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
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    {
                      label: 'Tickets ouverts',
                      value: stats.openTickets,
                      icon: Ticket,
                    },
                    {
                      label: 'Clients actifs',
                      value: stats.clients,
                      icon: Users,
                    },
                    {
                      label: 'Total tickets',
                      value: stats.totalTickets,
                      icon: LayoutDashboard,
                    },
                    {
                      label: 'Sans réponse',
                      value: stats.noReply,
                      icon: Bell,
                    },
                    {
                      label: 'Messages',
                      value: stats.messages,
                      icon: MessageSquare,
                    },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <motion.div key={item.label} custom={i} variants={fadeUp}>
                        <Card className="rounded-[28px] border-white/10 bg-card/60 backdrop-blur-xl">
                          <CardContent className="p-6">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                              <Icon className="h-5 w-5 text-brand" />
                            </div>
                            <p className="text-sm text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-4xl font-black tracking-tight">{item.value}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle>Accès rapide</CardTitle>
                      <CardDescription>
                        Les zones les plus importantes du pilotage admin.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          title: 'Gestion des tickets',
                          desc: 'Voir, répondre et piloter les tickets clients.',
                          icon: Ticket,
                          to: 'tickets' as AdminSection,
                        },
                        {
                          title: 'Clients',
                          desc: 'Voir les comptes et leur historique ticket.',
                          icon: Users,
                          to: 'clients' as AdminSection,
                        },
                        {
                          title: 'Messages',
                          desc: 'Retrouver les réponses et interactions support.',
                          icon: MessageSquare,
                          to: 'messages' as AdminSection,
                        },
                        {
                          title: 'Équipe VALT',
                          desc: 'Vue équipe, rôles et organisation support.',
                          icon: Building2,
                          to: 'team' as AdminSection,
                        },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.title}
                            onClick={() => setSection(item.to)}
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
                      <CardTitle>Signal admin</CardTitle>
                      <CardDescription>
                        Ce que l’équipe doit voir tout de suite.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4">
                        <p className="text-sm font-semibold">Priorité support</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {stats.noReply > 0
                            ? `${stats.noReply} ticket(s) semblent sans réponse.`
                            : 'Tous les tickets ont déjà au moins une réponse.'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                        <p className="text-sm font-semibold">Vision produit</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Le dashboard admin doit rester aligné avec l’univers premium de Seopic et donner une lecture rapide du support, des clients et des signaux plateforme.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                        <p className="text-sm font-semibold">Navigation croisée</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild variant="outline" className="rounded-full">
                            <Link href="/dashboard">Dashboard client</Link>
                          </Button>
                          <Button asChild variant="outline" className="rounded-full">
                            <Link href="/">Landing</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {section === 'tickets' && (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Tickets clients</CardTitle>
                    <CardDescription>
                      Toutes les demandes centralisées pour l’admin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/45 px-4 py-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        placeholder="Rechercher un ticket, un email, un client…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-3">
                      {ticketsLoading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
                      ) : filteredTickets.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Aucun ticket trouvé.</div>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={cn(
                              'w-full rounded-[24px] border bg-background/45 p-4 text-left transition',
                              selectedTicket?.id === ticket.id
                                ? 'border-brand/25'
                                : 'border-white/10 hover:border-white/20'
                            )}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={statusTone(ticket.status)}>
                                {ticket.status || 'Ouvert'}
                              </Badge>
                              <Badge variant="outline">{ticket.priority || 'Moyenne'}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(ticket.created_at)}
                              </span>
                            </div>
                            <p className="text-sm font-bold">{ticket.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {ticket.description}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {ticket.client_name || 'Client'} · {ticket.client_email || '—'}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Détail ticket</CardTitle>
                    <CardDescription>
                      Ouvre un ticket pour voir le détail et répondre.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedTicket ? (
                      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-background/40 p-8 text-center">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                            <LifeBuoy className="h-6 w-6 text-brand" />
                          </div>
                          <h3 className="text-lg font-bold">Aucun ticket sélectionné</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Sélectionne un ticket dans la colonne de gauche.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={statusTone(selectedTicket.status)}>
                              {selectedTicket.status || 'Ouvert'}
                            </Badge>
                            <Badge variant="outline">{selectedTicket.priority || 'Moyenne'}</Badge>
                          </div>
                          <h3 className="text-xl font-black tracking-tight">{selectedTicket.title}</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            {selectedTicket.description}
                          </p>
                          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium text-foreground">Client :</span>{' '}
                              {selectedTicket.client_name || 'Client'}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Email :</span>{' '}
                              {selectedTicket.client_email || '—'}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Date :</span>{' '}
                              {formatDate(selectedTicket.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                          <p className="mb-3 text-sm font-semibold">Historique des réponses</p>
                          {!selectedTicket.replies || selectedTicket.replies.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune réponse pour le moment.</p>
                          ) : (
                            <div className="space-y-3">
                              {selectedTicket.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="rounded-2xl border border-white/10 bg-background/60 p-4"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium">
                                      {reply.author || 'Support'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">
                                    {reply.message || '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                          <p className="mb-3 text-sm font-semibold">Répondre au client</p>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Écris ta réponse…"
                            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-brand/30"
                          />

                          {replyError && (
                            <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                              {replyError}
                            </div>
                          )}

                          <div className="mt-4">
                            <Button
                              onClick={submitReply}
                              disabled={replyLoading || !replyText.trim()}
                              variant="brand"
                              className="rounded-full"
                            >
                              {replyLoading ? 'Envoi…' : 'Envoyer la réponse'}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === 'clients' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>
                    Vue consolidée des clients issue des tickets.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clients.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                        <Users className="h-6 w-6 text-brand" />
                      </div>
                      <p className="text-lg font-bold">Aucun client trouvé</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Les clients apparaîtront ici à partir des tickets reçus.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {clients.map((client) => (
                        <div
                          key={client.email}
                          className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/12">
                              <UserCircle2 className="h-5 w-5 text-brand" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{client.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-white/10 bg-background/60 p-3">
                              <p className="text-xs text-muted-foreground">Tickets</p>
                              <p className="mt-1 text-xl font-black">{client.tickets}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-background/60 p-3">
                              <p className="text-xs text-muted-foreground">Ouverts</p>
                              <p className="mt-1 text-xl font-black">{client.open}</p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-muted-foreground">
                            Dernier signal : {formatDate(client.lastDate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {section === 'messages' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>
                    Réponses envoyées depuis l’espace admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12">
                        <MessageSquare className="h-6 w-6 text-brand" />
                      </div>
                      <p className="text-lg font-bold">Aucun message</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Les réponses support apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-brand/20 text-brand">
                              {message.author}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Ticket : {message.ticketTitle}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm leading-7 text-muted-foreground">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {section === 'team' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Équipe VALT</CardTitle>
                  <CardDescription>
                    Bloc admin premium pour montrer la structure interne.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    {
                      name: 'Support Lead',
                      role: 'Pilotage tickets & qualité de réponse',
                    },
                    {
                      name: 'SEO Strategist',
                      role: 'Audit, priorités SEO et supervision produit',
                    },
                    {
                      name: 'Product / Ops',
                      role: 'Vision plateforme, performance et coordination',
                    },
                  ].map((member) => (
                    <div
                      key={member.name}
                      className="rounded-[24px] border border-white/10 bg-background/45 p-5"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                        <Building2 className="h-5 w-5 text-brand" />
                      </div>
                      <p className="text-lg font-bold">{member.name}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{member.role}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {section === 'settings' && (
              <Card className="rounded-[32px] border-white/10 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Paramètres admin</CardTitle>
                  <CardDescription>
                    Réglages et navigation système.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <Shield className="h-5 w-5 text-brand" />
                      <p className="font-semibold">Session</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{session?.user?.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{session?.user?.email}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <LayoutDashboard className="h-5 w-5 text-brand" />
                      <p className="font-semibold">Navigation</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="rounded-full">
                        <Link href="/dashboard">Dashboard client</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full">
                        <Link href="/">Landing</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-background/45 p-5 md:col-span-2">
                    <div className="mb-3 flex items-center gap-3">
                      <Crown className="h-5 w-5 text-brand" />
                      <p className="font-semibold">Direction visuelle</p>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Le dashboard admin doit être aussi premium que l’espace client : même langage visuel, même cohérence de cartes, mêmes arrondis et même sensation “SaaS haut de gamme”.
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
