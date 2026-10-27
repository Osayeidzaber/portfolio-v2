"use client"

import { useSyncExternalStore } from "react"

const key = "oz-reduced-effects"
const changed = "oz-effects-change"
let memoryPreference = false

function readPreference() {
  try { const saved = window.localStorage.getItem(key); return saved === null ? memoryPreference : saved === "true" }
  catch { return memoryPreference }
}
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback)
  window.addEventListener("storage", callback)
  return () => { window.removeEventListener(changed, callback); window.removeEventListener("storage", callback) }
}
const serverPreference = () => false

export function useReducedEffects() {
  return useSyncExternalStore(subscribe, readPreference, serverPreference)
}

export function setReducedEffects(value: boolean) {
  memoryPreference = value
  try { window.localStorage.setItem(key, String(value)) } catch { /* Still works for this page when storage is unavailable. */ }
  document.documentElement.dataset.effects = value ? "reduced" : "full"
  window.dispatchEvent(new Event(changed))
}
