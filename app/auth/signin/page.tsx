'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

const features = [
  'Analyse IA complète de vos images',
  'Alt text, title et description générés',
  'Injection SEO et export JPG / PNG / WEBP',
  'Historique et workflow centralisés',
]

const stats = [
  { label: 'Analyse IA', value: 'Claude Sonnet', icon: Sparkles },
  { label: 'Compression', value: 'Jusqu’à -76%', icon: Zap },
  { label: 'Formats', value: 'JPG · PNG · WEBP', icon: ImageIcon },
]

export default function SignInPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-brand/10 blur-[100px]" />
        <div className="absolute right-[10%] top-[12%] h-[280px] w-[280px] rounded-full bg-orange-400/10 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[25%] h-[260px] w-[260px] rounded-full bg-yellow-400/5 blur-[100px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden border-r border-white/10 lg:flex">
          <div className="flex w-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à l’accueil
              </Link>

              <div className="mt-10 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-[0_0_30px_hsl(22_82%_55%/0.35)]">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight">
                    Seo<span className="text-brand">Pic</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Visual SEO Operating System</div>
                </div>
              </div>

              <div className="mt-14 max-w-xl">
                <h1 className="text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">
                  Dominez Google.
                  <br />
                  <span className="gradient-brand">Automatiquement.</span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
                  L’outil SEO image propulsé par l’IA qui transforme vos visuels
                  en actifs prêts pour le référencement, l’optimisation et
                  l’export web.
                </p>

                <div className="mt-8 space-y-4">
                  {features.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
                        <Check className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <span className="text-base text-foreground/95">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {stats.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
                      >
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/12">
                          <Icon className="h-4 w-4 text-brand" />
                        </div>
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.label}
                        </div>
                        <div className="mt-2 text-base font-bold">{item.value}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <Card className="mt-10 rounded-[28px] border-white/10 bg-white/[0.04] backdrop-blur-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-1 text-brand">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>

                <p className="text-lg italic leading-8 text-foreground/90">
                  “SEOPIC a transformé notre trafic Google Images. +340% en 3 semaines,
                  sans toucher à notre contenu.”
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                    S
                  </div>
                  <div>
                    <div className="font-semibold">Sophie Marchand</div>
                    <div className="text-sm text-muted-foreground">
                      Directrice Marketing, Paris
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-lg"
          >
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="text-xl font-black tracking-tight">
                  Seo<span className="text-brand">Pic</span>
                </div>
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </div>

            <Card className="overflow-hidden rounded-[32px] border-white/10 bg-card/60 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <CardContent className="p-7 sm:p-9">
                <div className="mb-8 flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                  <button className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_hsl(22_82%_55%/0.25)]">
                    Créer un compte
                  </button>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="flex-1 rounded-full px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    Se connecter
                  </button>
                </div>

                <div>
                  <h2 className="text-4xl font-black tracking-tight">
                    Créez votre compte gratuit
                  </h2>
                  <p className="mt-3 text-base text-muted-foreground">
                    5 analyses offertes. Aucune carte bancaire requise.
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <Button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    variant="outline"
                    className="h-14 w-full rounded-2xl text-base"
                  >
                    <GoogleIcon />
                    <span className="ml-2">Continuer avec Google</span>
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-sm text-muted-foreground">
                        accès rapide et sécurisé
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <ShieldCheck className="h-4 w-4 text-brand" />
                        Connexion fiable
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Authentification Google pour un accès immédiat à votre espace.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4 text-brand" />
                        Expérience fluide
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Commencez en quelques secondes et analysez vos visuels sans friction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[24px] border border-brand/20 bg-brand/10 p-5">
                  <div className="text-sm font-semibold text-brand">
                    Ce que vous débloquez dès l’inscription
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-foreground/90">
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>Analyse automatique du contenu visuel</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>Génération du title, alt text, description et keywords</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>Injection SEO et export prêt pour le web</span>
                    </div>
                  </div>
                </div>

                <p className="mt-8 text-center text-sm leading-7 text-muted-foreground">
                  En continuant, vous acceptez nos{' '}
                  <Link href="/terms" className="text-brand hover:underline">
                    CGU
                  </Link>{' '}
                  et notre{' '}
                  <Link href="/privacy" className="text-brand hover:underline">
                    Politique de confidentialité
                  </Link>
                  .
                </p>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="font-semibold text-brand hover:underline"
                  >
                    Se connecter
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
