// Maps a failed S/4HANA call to a message key, so a bad API key does not look like an outage.
export function s4ErrorMessage(err: any): 'S4_AUTH_FAILED' | 'S4_UNAVAILABLE' {
  const status =
    err?.reason?.response?.status ??
    err?.cause?.response?.status ??
    err?.response?.status ??
    err?.statusCode ??
    Number(/status code (\d{3})/.exec(String(err?.message ?? ''))?.[1])
  return status === 401 || status === 403 ? 'S4_AUTH_FAILED' : 'S4_UNAVAILABLE'
}
