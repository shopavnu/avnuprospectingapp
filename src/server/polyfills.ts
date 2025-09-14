// Server-side polyfills for Node.js environments where some Web APIs are missing (notably File in Node 18)
// This ensures that evaluating server modules (e.g., during Next.js build) doesn't crash with "File is not defined".

import { Blob as BufferBlob } from 'buffer'

const g = globalThis as unknown as Record<string, any>

// Provide Blob from buffer if not present (older Node)
if (typeof g.Blob === 'undefined' && typeof BufferBlob !== 'undefined') {
  g.Blob = BufferBlob
}

// Minimal File polyfill for Node 18 (extends Blob)
if (typeof g.File === 'undefined') {
  class NodeFile extends (g.Blob || BufferBlob) {
    name: string
    lastModified: number
    // Needed for Object.prototype.toString.call(file) === "[object File]"
    get [Symbol.toStringTag]() {
      return 'File'
    }
    constructor(fileBits: any[], fileName: string, options?: { type?: string; lastModified?: number }) {
      super(fileBits, options as any)
      this.name = String(fileName ?? '')
      this.lastModified = options?.lastModified ?? Date.now()
    }
  }
  g.File = NodeFile as any
}
