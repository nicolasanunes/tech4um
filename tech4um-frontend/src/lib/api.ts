const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiFetchOptions {
  retryOnUnauthorized?: boolean
  timeoutMs?: number
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
  const { retryOnUnauthorized = true, timeoutMs = 0 } = options

  const timeoutController =
    timeoutMs > 0 ? new AbortController() : null
  const onParentAbort = () => timeoutController?.abort()

  if (timeoutController && init.signal) {
    if (init.signal.aborted) {
      timeoutController.abort()
    } else {
      init.signal.addEventListener('abort', onParentAbort, { once: true })
    }
  }

  const timeoutId =
    timeoutController && timeoutMs > 0
      ? setTimeout(() => timeoutController.abort(), timeoutMs)
      : null

  const requestInit: RequestInit = {
    ...init,
    credentials: 'include',
    signal: timeoutController?.signal ?? init.signal,
  }

  const doFetch = async (): Promise<Response> => fetch(apiUrl(path), requestInit)

  let response = await doFetch()

  const isRefreshEndpoint = path.includes('/auth/refresh')

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isRefreshEndpoint
  ) {
    const refreshed = await refreshTokens()

    if (refreshed) {
      response = await doFetch()
    }
  }

  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  if (timeoutController && init.signal) {
    init.signal.removeEventListener('abort', onParentAbort)
  }

  return response
}
