"use client"

import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"

import { detectWebGL, useIdleReady, useReducedMotion } from "@/lib/motion/hooks"
import { cn } from "@/lib/utils"
import { useReducedEffects } from "@/lib/motion/preferences"

/*
 * Wraps every WebGL effect:
 *  - mounts it only once its box is near the viewport (and unmounts far away, freeing the GPU)
 *  - renders `fallback` when WebGL is missing, the context is lost, the effect throws,
 *    or (unless `motionSafe`) the visitor prefers reduced motion
 */

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn("[webgl] effect failed, showing fallback", err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function WebGLGate({
  children,
  fallback,
  className,
  margin = "300px",
  keepMounted = false,
  motionSafe = false,
  defer = false,
}: {
  children: ReactNode
  fallback: ReactNode
  className?: string
  /** IntersectionObserver rootMargin for mounting. */
  margin?: string
  /** Keep the effect alive once mounted (for small effects that are cheap when paused). */
  keepMounted?: boolean
  /** The effect is still fine with reduced motion (it is static or user-driven). */
  motionSafe?: boolean
  /** Wait for load + idle before mounting (for above-the-fold effects). */
  defer?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const reducedEffects = useReducedEffects()
  const idle = useIdleReady()
  // null on the server and during hydration, then the cached probe result.
  const supported = useSyncExternalStore<boolean | null>(() => () => {}, detectWebGL, () => null)
  const [near, setNear] = useState(false)
  // Real context losses so far. The first couple remount the effect on a fresh canvas;
  // after that we stop trying and show the fallback.
  const [losses, setLosses] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
        else if (!keepMounted) setNear(false)
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, keepMounted])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mountedAt = performance.now()
    const onLost = (e: Event) => {
      const canvas = e.target as HTMLCanvasElement
      // Effects release their context on unmount (and StrictMode unmounts once right
      // after mounting), so ignore losses just after mount or from detached canvases.
      if (performance.now() - mountedAt < 1500) return
      window.setTimeout(() => {
        if (canvas.isConnected) setLosses((n) => n + 1)
      }, 50)
    }
    el.addEventListener("webglcontextlost", onLost, true)
    return () => el.removeEventListener("webglcontextlost", onLost, true)
  }, [near, losses])

  const live = supported && !reducedEffects && losses < 3 && (motionSafe || !reduced) && (!defer || idle)

  return (
    <div ref={ref} className={cn("relative", className)}>
      {live && near ? (
        <Boundary key={losses} fallback={fallback}>
          {children}
        </Boundary>
      ) : (
        fallback
      )}
    </div>
  )
}
