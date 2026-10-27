"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useReducedEffects } from "./preferences"

const query = "(prefers-reduced-motion: reduce)"

export function useReducedMotion(): boolean {
  const reducedEffects = useReducedEffects()
  const systemReduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
  return systemReduced || reducedEffects
}

export function useMediaQuery(q: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(q)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(q).matches,
    () => serverValue,
  )
}

let webglCache: boolean | null = null

/** One probe per page load; the probe context is released immediately. */
export function detectWebGL(): boolean {
  if (webglCache !== null) return webglCache
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null
    webglCache = Boolean(gl)
    gl?.getExtension("WEBGL_lose_context")?.loseContext()
  } catch {
    webglCache = false
  }
  return webglCache
}

/**
 * Turns true once the page has loaded and the main thread has had a quiet moment.
 * Used to start decorative GPU work after first paint and hydration, not during.
 */
export function useIdleReady(extraDelayMs = 0): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let timer = 0
    let idle = 0
    const go = () => {
      const schedule = (cb: () => void) => {
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(cb, { timeout: 2500 })
        else timer = window.setTimeout(cb, 300)
      }
      timer = window.setTimeout(() => schedule(() => setReady(true)), extraDelayMs)
    }
    if (document.readyState === "complete") go()
    else window.addEventListener("load", go, { once: true })
    return () => {
      window.removeEventListener("load", go)
      window.clearTimeout(timer)
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle)
    }
  }, [extraDelayMs])
  return ready
}
