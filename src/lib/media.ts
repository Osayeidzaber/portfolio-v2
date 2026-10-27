import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { canPublish } from "@/lib/env"
import { readRepoBinary } from "@/lib/content/store"

export const UPLOAD_DIR = "content/uploads"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  pdf: "application/pdf",
}

/** Only flat, content-hashed file names produced by the uploader are valid. */
export const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,80}\.[a-f0-9]{10}\.(png|jpe?g|webp|avif|gif|pdf)$/

export function mediaType(name: string) {
  return TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"
}

/**
 * Reads an uploaded file. From the content repo when publishing is configured (so a new
 * upload is live before the redeploy finishes), otherwise from the bundled folder.
 */
export async function readMedia(name: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  if (!SAFE_NAME.test(name)) return null
  if (canPublish()) {
    const file = await readRepoBinary(`${UPLOAD_DIR}/${name}`).catch(() => null)
    if (file) return { bytes: file.bytes, type: mediaType(name) }
  }
  try {
    const buf = await readFile(join(process.cwd(), "content", "uploads", name))
    return { bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, type: mediaType(name) }
  } catch {
    return null
  }
}
