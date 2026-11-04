// React dev builds (≤ 18) record where each element was written as
// fiber._debugSource. Only readable from the page's own JS world.

interface Fiber {
  _debugSource?: { fileName?: string; lineNumber?: number; columnNumber?: number };
  return?: Fiber | null;
}

export function reactSource(el: Element): string | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
  let fiber = key ? ((el as unknown as Record<string, Fiber | undefined>)[key] ?? null) : null;
  for (let depth = 0; fiber && depth < 10; depth++, fiber = fiber.return ?? null) {
    const src = fiber._debugSource;
    if (src?.fileName) return src.lineNumber ? `${src.fileName}:${src.lineNumber}` : src.fileName;
  }
  return null;
}
