"use client"

import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react"

import { uploadFile } from "@/app/admin/actions"
import { cn } from "@/lib/utils"

/** Validation messages keyed by dotted path ("projects.2.slug"), from the shared zod schema. */
export const ErrorsContext = createContext<Record<string, string>>({})

function useError(path?: string) {
  const errors = useContext(ErrorsContext)
  return path ? errors[path] : undefined
}

const inputClass =
  "w-full rounded-[10px] border bg-lift px-3.5 py-3 text-[16px] text-paper outline-none transition-colors placeholder:text-[#7d7d7d] focus:border-paper"

export function Field({
  label,
  hint,
  path,
  children,
  id,
}: {
  label: string
  hint?: string
  path?: string
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode
  id?: string
}) {
  const auto = useId()
  const fieldId = id ?? auto
  const error = useError(path)
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={fieldId} className="text-[14px] text-mist">
        {label}
      </label>
      {children({ id: fieldId, invalid: Boolean(error), describedBy })}
      {error ? (
        <span id={`${fieldId}-error`} role="alert" className="text-[13px] text-paper">
          ⚠ {error}
        </span>
      ) : (
        hint && (
          <span id={`${fieldId}-hint`} className="text-[13px] text-dust">
            {hint}
          </span>
        )
      )}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  path,
  hint,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  path?: string
  hint?: string
  placeholder?: string
  type?: "text" | "url" | "email" | "month"
}) {
  return (
    <Field label={label} path={path} hint={hint}>
      {({ id, invalid, describedBy }) => (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, invalid ? "border-paper" : "border-edge")}
        />
      )}
    </Field>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  path,
  hint,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  path?: string
  hint?: string
  rows?: number
}) {
  return (
    <Field label={label} path={path} hint={hint}>
      {({ id, invalid, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, "resize-y leading-[1.5]", invalid ? "border-paper" : "border-edge")}
        />
      )}
    </Field>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  path,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  path?: string
}) {
  return (
    <Field label={label} path={path}>
      {({ id, invalid }) => (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "appearance-none", invalid ? "border-paper" : "border-edge")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <span className="relative inline-flex">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full border border-edge bg-lift transition-colors peer-checked:border-paper peer-checked:bg-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper" />
        <span className="absolute left-1 top-1 size-4 rounded-full bg-dust transition-transform peer-checked:translate-x-5 peer-checked:bg-ink" />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px]">{label}</span>
        {hint && <span className="text-[13px] text-dust">{hint}</span>}
      </span>
    </label>
  )
}

/** Comma-separated list, edited as chips. */
export function TagInput({
  label,
  value,
  onChange,
  hint,
  path,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  hint?: string
  path?: string
}) {
  const [text, setText] = useState("")
  const add = () => {
    const parts = text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))])
    setText("")
  }
  return (
    <Field label={label} hint={hint ?? "Type and press Enter or comma"} path={path}>
      {({ id, describedBy }) => (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-edge bg-lift p-2 focus-within:border-paper">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-edge py-1 pl-3 pr-1 text-[13px]">
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== t))}
                aria-label={`Remove ${t}`}
                className="flex size-6 items-center justify-center rounded-full hover:bg-paper hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={id}
            value={text}
            aria-describedby={describedBy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault()
                add()
              } else if (e.key === "Backspace" && !text && value.length) {
                onChange(value.slice(0, -1))
              }
            }}
            onBlur={add}
            className="min-w-[120px] flex-1 bg-transparent px-1.5 py-1.5 text-[15px] outline-none"
          />
        </div>
      )}
    </Field>
  )
}

/** Upload (drag-and-drop or picker) with an image preview, or paste an https URL. */
export function FileField({
  label,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/avif,image/gif",
  hint,
  path,
  kind = "image",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  accept?: string
  hint?: string
  path?: string
  kind?: "image" | "document"
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [over, setOver] = useState(false)

  const send = async (file: File) => {
    setBusy(true)
    setError("")
    const form = new FormData()
    form.set("file", file)
    const res = await uploadFile(form)
    setBusy(false)
    if (res.ok) onChange(res.data.path)
    else setError(res.error)
  }

  return (
    <Field label={label} hint={hint} path={path}>
      {({ id }) => (
        <div className="flex flex-col gap-2">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              const f = e.dataTransfer.files[0]
              if (f) send(f)
            }}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-[12px] border border-dashed p-3 transition-colors",
              over ? "border-paper bg-lift" : "border-edge",
            )}
          >
            {kind === "image" && (
              <div className="flex aspect-[16/10] w-36 flex-none items-center justify-center overflow-hidden rounded-[8px] bg-lift">
                {value ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of an upload
                  <img src={value} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center font-mono text-[11px] text-dust">No image</span>
                )}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  disabled={busy}
                  className="pill pill-line h-10 px-4 text-[14px] disabled:opacity-60"
                >
                  {busy ? "Uploading…" : value ? "Replace" : "Upload"}
                </button>
                {value && (
                  <button type="button" onClick={() => onChange("")} className="pill h-10 px-4 text-[14px] text-dust hover:text-paper">
                    Remove
                  </button>
                )}
              </div>
              <input
                id={id}
                type="url"
                value={value}
                placeholder="…or paste an https:// link"
                onChange={(e) => onChange(e.target.value)}
                className={cn(inputClass, "border-edge py-2 text-[14px]")}
              />
              {kind === "document" && value && (
                <a href={value} target="_blank" rel="noreferrer" className="text-[13px] text-mist underline">
                  Open current file
                </a>
              )}
              {error && (
                <span role="alert" className="text-[13px] text-paper">
                  ⚠ {error}
                </span>
              )}
            </div>
            <input
              ref={input}
              type="file"
              accept={accept}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) send(f)
                e.target.value = ""
              }}
            />
          </div>
        </div>
      )}
    </Field>
  )
}

export function Panel({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[32px] font-bold leading-none tracking-[-0.02em]">{title}</h2>
          {description && <p className="max-w-[640px] text-[15px] leading-[1.5] text-dust">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[14px] border border-rule p-5", className)}>{children}</div>
}
