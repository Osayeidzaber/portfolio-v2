// @vitest-environment jsdom
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ConfirmProvider } from "@/components/admin/confirm"
import { ClientPicker } from "@/components/studio/client-picker"
import type { Billing } from "@/lib/studio/schema"

const original: Billing = { name: "Current client", company: "Current company", email: "current@example.com", address: "Current address" }
const selected: Billing = { name: "Selected client", company: "Selected company", email: "selected@example.com", address: "Latest billing address" }

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false } },
  })
  vi.spyOn(window, "confirm").mockImplementation(() => { throw new Error("A browser confirmation should never open.") })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function setup(initial = original, choices = [{ ...selected }]) {
  const changed = vi.fn()
  function Form() {
    const [client, setClient] = useState(initial)
    return <ConfirmProvider><ClientPicker clients={choices} current={client} onChange={(next) => { changed(next); setClient(next) }} />{Object.entries(client).map(([key, value]) => <label key={key}>{key}<input value={value} readOnly /></label>)}</ConfirmProvider>
  }
  render(<Form />)
  const choose = () => fireEvent.change(screen.getByRole("combobox", { name: "Use a previous client" }), { target: { value: selected.email } })
  return { choose, changed, choices }
}

describe("previous-client confirmation", () => {
  it("fills every billing field after confirming the snapshotted selection", async () => {
    const { choose, changed, choices } = setup()
    choose()
    const dialog = await screen.findByRole("dialog", { name: "Replace billing details?" })
    expect(dialog.textContent).toContain(selected.email)
    expect(changed).not.toHaveBeenCalled()
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("")
    choices[0].address = "Changed after selection"
    fireEvent.click(screen.getByRole("button", { name: "Use this client" }))
    await waitFor(() => expect(changed).toHaveBeenCalledWith(selected))
    for (const [key, value] of Object.entries(selected)) expect((screen.getByLabelText(key) as HTMLInputElement).value).toBe(value)
    expect(window.confirm).not.toHaveBeenCalled()
  })
  it("keeps existing values on cancel and allows selecting the same client again", async () => {
    const { choose, changed } = setup()
    choose()
    await screen.findByRole("dialog")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(changed).not.toHaveBeenCalled()
    expect((screen.getByLabelText("email") as HTMLInputElement).value).toBe(original.email)
    choose()
    await screen.findByRole("dialog")
    fireEvent.click(screen.getByRole("button", { name: "Use this client" }))
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1))
  })
  it("treats Escape as cancellation", async () => {
    const { choose, changed } = setup()
    choose()
    const dialog = await screen.findByRole("dialog")
    fireEvent(dialog, new Event("cancel", { cancelable: true }))
    expect(changed).not.toHaveBeenCalled()
    expect((screen.getByLabelText("address") as HTMLInputElement).value).toBe(original.address)
  })
  it("fills blank billing fields immediately without an overwrite confirmation", () => {
    const { choose, changed } = setup({ name: "", company: "", email: "", address: "" })
    choose()
    expect(changed).toHaveBeenCalledWith(selected)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(window.confirm).not.toHaveBeenCalled()
  })
})
