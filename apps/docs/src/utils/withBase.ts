export function withBase(href: string): string {
  if (/^(https?:)?\/\//.test(href) || href.startsWith('#') || href.startsWith('mailto:')) return href
  return href.startsWith('/') ? `${import.meta.env.BASE_URL}${href.slice(1)}` : href
}
