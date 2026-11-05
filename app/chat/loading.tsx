// /chat renders on the server per request (a saved chat, a seed); this shows at once so the click navigates
// immediately instead of waiting on it.
export default function Loading() {
  return <div className="h-dvh bg-background" />;
}
