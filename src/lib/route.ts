import { useEffect, useState } from 'react'

export type Route =
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'activity' }
  | { name: 'circle'; id: bigint }

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0]
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'create') return { name: 'create' }
  if (parts[0] === 'activity') return { name: 'activity' }
  if (parts[0] === 'circle' && parts[1] && /^\d+$/.test(parts[1])) {
    return { name: 'circle', id: BigInt(parts[1]) }
  }
  return { name: 'dashboard' }
}

export function navigate(path: string) {
  window.location.hash = path.startsWith('/') ? path : `/${path}`
  window.scrollTo({ top: 0 })
}

export const circlePath = (id: bigint | number) => `/circle/${id}`

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
