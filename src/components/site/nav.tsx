"use client"

import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import LetterSwapForward from "@/components/fancy/text/letter-swap-forward-anim"
import { cn } from "@/lib/utils"

export type NavItem = { id: string; label: string; folio: string }

export function Nav({
  items,
  name,
  socials,
}: {
  items: NavItem[]
  name: string
  socials: Array<{ label: string; url: string }>
}) {
  const pathname = usePathname()
  const onHome = pathname === "/"
  const [active, setActive] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLDivElement>(null)

  // Active section: the one whose band crosses 40% of the viewport height.
  useEffect(() => {
    if (!onHome) return
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items, onHome])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    menuButton.current?.focus()
  }, [])

  // Phone menu: Escape closes, Tab stays inside, page behind does not scroll.
  useEffect(() => {
    if (!open) return
    const panel = menuPanel.current
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>("a,button") ?? [])
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key !== "Tab") return
      const list = focusables()
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  const href = (id: string) => (onHome ? `#${id}` : `/#${id}`)
  const primary = items.filter((i) => ["work", "about", "ledger", "play", "contact"].includes(i.id))
  // Intermediate chapters belong to the preceding primary item; never unmount the
  // shared indicator just because Toolkit or Experience crosses the viewport.
  const activeIndex = items.findIndex((item) => item.id === active)
  const primaryIds = new Set(primary.map((item) => item.id))
  const activePrimary = onHome
    ? items.slice(0, activeIndex + 1).findLast((item) => primaryIds.has(item.id))?.id
    : pathname.startsWith("/work/") ? "work" : undefined

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[padding] duration-500 ease-[var(--ease-press)]",
          scrolled ? "bg-gradient-to-b from-ink via-ink/85 to-transparent py-3" : "py-5",
        )}
      >
        <div className="gutter flex items-center justify-between gap-4">
          <Link href="/" className="folio !text-paper">
            OZ — Vol. 26<span className="sr-only">, {name} home</span>
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex gap-1 rounded-full border border-rule bg-ink/80 p-[5px] backdrop-blur-md">
              {primary.map((item) => {
                const isActive = activePrimary === item.id
                return (
                  <li key={item.id} className="relative">
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-paper"
                        transition={{ type: "spring", visualDuration: 0.4, bounce: 0 }}
                      />
                    )}
                    <a
                      href={href(item.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "folio relative z-[1] flex h-10 items-center px-4 transition-colors",
                        isActive ? "!text-ink" : "hover:!text-paper",
                      )}
                    >
                      <LetterSwapForward label={item.label} staggerFrom="first" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          <a href={href("contact")} className="folio hidden !text-paper md:inline">
            Say hello ↗
          </a>

          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            className="flex size-12 items-center justify-center rounded-full border border-edge bg-ink/80 backdrop-blur md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M2 6h14M2 12h14" />
            </svg>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-0 z-[60] flex flex-col justify-between bg-ink px-4 pb-7 pt-5 md:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 44px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 44px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <span className="folio !text-paper">OZ — Vol. 26</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="flex size-12 items-center justify-center rounded-full bg-paper text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <nav aria-label="Primary" className="border-t border-rule">
              {items.map((item, i) => (
                <motion.a
                  key={item.id}
                  href={href(item.id)}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-baseline justify-between border-b border-rule py-3"
                >
                  <span className="text-[44px] font-bold leading-none tracking-[-0.04em]">{item.label}</span>
                  <span className="folio">{item.folio}</span>
                </motion.a>
              ))}
            </nav>
            <div className="flex flex-wrap justify-between gap-4">
              {socials.map((s) => (
                <a key={s.url} href={s.url} className="folio py-3" target="_blank" rel="noreferrer">
                  {s.label} ↗
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
