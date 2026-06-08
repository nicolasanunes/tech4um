const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiFetchOptions {
  retryOnUnauthorized?: boolean
}

let refreshPromise: Promise<boolean> | null = null

export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { retryOnUnauthorized = true } = options

  const requestInit: RequestInit = {
    ...init,
    credentials: 'include',
  }

  let response = await fetch(apiUrl(path), requestInit)

  const isRefreshEndpoint = path.includes('/auth/refresh')

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isRefreshEndpoint
  ) {
    const refreshed = await refreshTokens()

    if (refreshed) {
      response = await fetch(apiUrl(path), requestInit)
    }
  }

  return response
}
