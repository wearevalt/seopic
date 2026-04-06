'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Menu,
  Moon,
  Search,
  Shield,
  Sparkles,
  Sun,
  Upload,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: 'easeOut' as const },
  }),
}

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const benefits = [
  {
    icon: Search,
    title: 'Gagnez en visibilité',
    desc: 'Générez des métadonnées SEO plus propres pour améliorer la compréhension de vos images par Google.',
  },
  {
    icon: Layers,
    title: 'Optimisez en masse',
    desc: 'Traitez plusieurs images rapidement avec un workflow simple pensé pour les e-commerçants et les agences.',
  },
  {
    icon: Wand2,
    title: 'Standardisez votre SEO',
    desc: 'Gardez une qualité homogène sur vos alt text, titres, descriptions et mots-clés.',
  },
]

const steps = [
  {
    icon: Upload,
    title: 'Ajoutez vos images',
    desc: 'Importez votre visuel en quelques secondes.',
  },
  {
    icon: Sparkles,
    title: 'SeoPic analyse',
    desc: 'L’IA détecte le contenu et propose des métadonnées SEO en français.',
  },
  {
    icon: BarChart3,
    title: 'Téléchargez et publiez',
    desc: 'Récupérez vos données optimisées et accélérez votre mise en ligne.',
  },
]

const pricing = [
  {
    name: 'Découverte',
    price: '0€',
    desc: 'Pour tester la plateforme',
    features: [
      '5 analyses par mois',
      '1 image à la fois',
      'Alt text et métadonnées',
      'Export standard',
    ],
    cta: 'Commencer gratuitement',
    variant: 'outline' as const,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '29€',
    desc: 'Pour les pros du SEO et du e-commerce',
    features: [
      'Analyses illimitées',
      'Traitement par lot',
      'Suggestions IA avancées',
      'Audit SEO image',
      'Historique des analyses',
      'Support prioritaire',
    ],
    cta: 'Passer au Pro',
    variant: 'brand' as const,
    highlight: true,
  },
  {
    name: 'Entreprise',
    price: 'Sur devis',
    desc: 'Pour équipes et agences',
    features: [
      'Tout le plan Pro',
      'Équipe illimitée',
      'Accès API',
      'White label',
      'Support dédié',
    ],
    cta: 'Nous contacter',
    variant: 'outline' as const,
    highlight: false,
  },
]

const faqs = [
  {
    q: 'SeoPic modifie-t-il mes images ?',
    a: 'SeoPic analyse vos visuels et génère les métadonnées SEO utiles. Selon votre workflow, vous pouvez ensuite les exploiter et les injecter dans votre processus.',
  },
  {
    q: 'À qui s’adresse SeoPic ?',
    a: 'Aux e-commerçants, agences, photographes, créateurs de contenu et équipes marketing qui veulent améliorer leur SEO visuel plus vite.',
  },
  {
    q: 'Puis-je commencer gratuitement ?',
    a: 'Oui. Le plan Découverte permet de tester la plateforme avant de passer sur un usage plus intensif.',
  },
]

function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isDark = theme === 'dark'

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/75 backdrop-blur-xl'
          : 'bg-transparent'
      )}
    >
      <div className="container flex h-16 max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-[0_0_24px_hsl(22_82%_55%/0.35)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight">
            Seo<span className="text-brand">Pic</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground">
            Avantages
          </a>
          <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground">
            Démo
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
            Tarifs
          </a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Changer le thème"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {session ? (
            <Button asChild variant="brand">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/signin">Connexion</Link>
              </Button>
              <Button asChild variant="brand">
                <Link href="/auth/signin">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground"
              aria-label="Changer le thème"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground"
            aria-label="Ouvrir le menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <div className="container flex flex-col gap-2 py-4">
            <a href="#benefits" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              Avantages
            </a>
            <a href="#demo" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              Démo
            </a>
            <a href="#pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              Tarifs
            </a>
            <a href="#faq" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              FAQ
            </a>
            <Button asChild variant="brand" className="mt-2 w-full">
              <Link href="/auth/signin">Essayer gratuitement</Link>
            </Button>
          </div>
        </div>
      )}
    </motion.header>
  )
}

function Hero() {
  const { data: session } = useSession()

  return (
    <section className="relative overflow-hidden pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand/12 blur-[120px]" />
        <div className="absolute right-0 top-0 h-[320px] w-[320px] rounded-full bg-orange-400/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      </div>

      <div className="container relative max-w-6xl py-14 md:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="brand" className="mb-6 gap-1.5 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3" />
              SEO visuel propulsé par IA
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl md:text-7xl"
          >
            Automatisez le SEO
            <br />
            <span className="gradient-brand">de vos images</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            SeoPic analyse vos visuels, génère vos métadonnées SEO et vous aide à
            améliorer votre visibilité sur Google Images avec un workflow simple,
            rapide et premium.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild variant="brand" size="lg" className="glow-brand min-w-[220px]">
              <Link href={session ? '/dashboard' : '/auth/signin'}>
                {session ? 'Aller au dashboard' : 'Essayer gratuitement'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-w-[220px]">
              <a href="#demo">Voir la démo</a>
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-500" />
              Sans carte bancaire
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-500" />
              Workflow simple et rapide
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-brand" />
              Pensé pour e-commerce et agences
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.45 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card/70 shadow-[0_20px_80px_hsl(22_82%_55%/0.10)] backdrop-blur-xl">
            <div className="border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                <span className="ml-3 text-sm text-muted-foreground">Analyse SEO — aperçu produit</span>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6">
                  <div className="flex h-[320px] items-center justify-center rounded-2xl bg-gradient-to-br from-brand/10 via-transparent to-orange-400/10">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15">
                        <ImageIcon className="h-8 w-8 text-brand" />
                      </div>
                      <p className="text-base font-semibold">Image produit importée</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Aperçu de votre visuel avant optimisation SEO
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Score SEO</span>
                      <span className="text-sm font-bold text-brand">86 / 100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-[86%] rounded-full bg-brand" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Alt text suggéré
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      Climatisation murale blanche installée dans un salon moderne
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Meta title
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      Climatisation murale moderne pour salon
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Mots-clés
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['climatisation', 'salon moderne', 'climatiseur mural', 'SEO image', 'maison'].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TrustBar() {
  return (
    <section className="py-6">
      <div className="container max-w-6xl">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <span>E-commerce</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span>Agences</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span>Photographes</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span>Créateurs de contenu</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span>Équipes marketing</span>
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section id="benefits" className="py-24">
      <div className="container max-w-6xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="brand" className="mb-4">
              Pourquoi SeoPic
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-black tracking-tight sm:text-5xl">
            Une interface plus simple,
            <br />
            <span className="gradient-brand">un SEO visuel plus propre</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            SeoPic vous aide à aller plus vite, garder une meilleure cohérence et
            créer un process plus premium autour de vos images.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-5 lg:grid-cols-3"
        >
          {benefits.map((item, i) => (
            <motion.div key={item.title} variants={fadeUp} custom={i}>
              <Card className="h-full overflow-hidden border-border/60 bg-card/60 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl">
                <CardContent className="p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                    <item.icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="py-24">
      <div className="container max-w-6xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="brand" className="mb-4">
              Comment ça marche
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-black tracking-tight sm:text-5xl">
            Trois étapes,
            <span className="gradient-brand"> zéro friction</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-5 md:grid-cols-3"
        >
          {steps.map((step, i) => (
            <motion.div key={step.title} variants={fadeUp} custom={i}>
              <Card className="h-full border-border/60 bg-card/60">
                <CardContent className="p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12">
                      <step.icon className="h-5 w-5 text-brand" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function Pricing() {
  const { data: session } = useSession()

  return (
    <section id="pricing" className="py-24">
      <div className="container max-w-6xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="brand" className="mb-4">
              Tarifs
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-black tracking-tight sm:text-5xl">
            Simple, lisible,
            <span className="gradient-brand"> efficace</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Commencez gratuitement, puis passez au plan Pro quand votre volume et
            vos besoins augmentent.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-6 md:grid-cols-3"
        >
          {pricing.map((plan, i) => (
            <motion.div key={plan.name} variants={fadeUp} custom={i}>
              <Card
                className={cn(
                  'relative h-full border-border/60 bg-card/60 transition duration-300 hover:-translate-y-1 hover:shadow-xl',
                  plan.highlight && 'border-brand/50 shadow-[0_0_50px_hsl(22_82%_55%/0.12)]'
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="brand">Le plus choisi</Badge>
                  </div>
                )}
                <CardContent className="flex h-full flex-col p-7">
                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="mt-3 text-4xl font-black tracking-tight">{plan.price}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button asChild variant={plan.variant} className="w-full">
                      <Link href={session ? '/dashboard' : '/auth/signin'}>
                        {plan.cta}
                        <ChevronRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24">
      <div className="container max-w-4xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-14 text-center"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="brand" className="mb-4">
              FAQ
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-black tracking-tight sm:text-5xl">
            Questions fréquentes
          </motion.h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((item, index) => {
            const active = open === index

            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
              >
                <button
                  onClick={() => setOpen(active ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold sm:text-base">{item.q}</span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      active && 'rotate-90'
                    )}
                  />
                </button>
                {active && (
                  <div className="px-6 pb-5 text-sm leading-7 text-muted-foreground">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  const { data: session } = useSession()

  return (
    <section className="pb-24 pt-8">
      <div className="container max-w-5xl">
        <div className="relative overflow-hidden rounded-[32px] border border-brand/25 bg-gradient-to-br from-brand/12 via-background to-orange-400/5 px-6 py-14 text-center shadow-[0_0_80px_hsl(22_82%_55%/0.10)] sm:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[220px] w-[420px] -translate-x-1/2 rounded-full bg-brand/10 blur-[70px]" />
          </div>

          <div className="relative">
            <Badge variant="brand" className="mb-5">
              Prêt à commencer ?
            </Badge>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Donnez à vos images
              <br />
              <span className="gradient-brand">un niveau SEO premium</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
              Essayez SeoPic, gagnez du temps et créez une image de marque plus
              sérieuse dans votre workflow SEO.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="brand" size="lg" className="glow-brand min-w-[220px]">
                <Link href={session ? '/dashboard' : '/auth/signin'}>
                  {session ? 'Ouvrir le dashboard' : 'Essayer gratuitement'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[220px]">
                <a href="#pricing">Voir les tarifs</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/70 py-10">
      <div className="container max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-black tracking-tight">
              Seo<span className="text-brand">Pic</span>
            </span>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            © 2026 SeoPic · Produit de VALT Agency · Tanger, Maroc
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Confidentialité
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Conditions
            </Link>
            <Link href="/auth/signin" className="hover:text-foreground">
              Connexion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Separator />
        <Benefits />
        <Separator />
        <HowItWorks />
        <Separator />
        <Pricing />
        <Separator />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
