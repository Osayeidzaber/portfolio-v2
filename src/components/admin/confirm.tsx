"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"

type Ask = { title: string; body?: string; confirm?: string; danger?: boolean }

const ConfirmContext = createContext<(ask: Ask) => Promise<boolean>>(async () => false)

export const useConfirm = () => useContext(ConfirmContext)

/** A native <dialog> confirm: focus is trapped, Escape cancels, focus returns afterwards. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})
  const [ask, setAsk] = useState<Ask | null>(null)

  const confirm = useCallback((next: Ask) => {
    setAsk(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  useEffect(() => {
    if (ask && !dialog.current?.open) dialog.current?.showModal()
  }, [ask])

  const close = (v: boolean) => {
    dialog.current?.close()
    setAsk(null)
    resolver.current(v)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault()
          close(false)
        }}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(92vw,440px)] rounded-[16px] border border-edge bg-lift p-6 text-paper backdrop:bg-black/70"
      >
        {ask && (
          <div className="flex flex-col gap-5">
            <h2 id="confirm-title" className="text-[22px] font-semibold">
              {ask.title}
            </h2>
            {ask.body && <p className="text-[15px] leading-[1.5] text-mist">{ask.body}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => close(false)} className="pill pill-line h-11" autoFocus>
                Cancel
              </button>
              <button type="button" onClick={() => close(true)} className="pill pill-solid h-11">
                {ask.confirm ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
