"use client"

// The chat names each message with crypto.randomUUID, which browsers offer only on a secure origin (https or
// localhost). The dev box serves NYSgpt over plain http on an IP address, where sending a message threw
// "crypto.randomUUID is not a function". Where it is missing, this supplies a version 4 UUID from
// crypto.getRandomValues, which every origin has. On https (nysgpt.com) the browser's own stays.
if (typeof window !== "undefined" && typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  const uuid = () => {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
  }
  Object.defineProperty(crypto, "randomUUID", { value: uuid, configurable: true, writable: true })
}

export function RandomUUID() {
  return null
}
