"use client"

import { useActionState } from "react"

import { loginAction } from "@/app/admin/actions"

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null)
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label htmlFor="password" className="text-[14px] text-mist">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={state?.error ? true : undefined}
        aria-describedby={state?.error ? "login-error" : undefined}
        className="h-14 rounded-[12px] border border-edge bg-lift px-4 text-[17px] text-paper outline-none focus:border-paper"
      />
      {state?.error && (
        <p id="login-error" role="alert" className="text-[14px] text-paper">
          ⚠ {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="pill pill-solid h-14 disabled:opacity-60">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  )
}
