import { useEffect, useState } from 'react'

export function useCatalogResource(load, key, delay = 0) {
  const [revision, setRevision] = useState(0)
  const requestKey = `${key}:${revision}`
  const [state, setState] = useState({ key: null, data: null, error: '' })
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => Promise.resolve().then(load).then(data => {
      if (active) setState({ key: requestKey, data, error: '' })
    }).catch(error => {
      if (active) setState({ key: requestKey, data: null, error: error.message })
    }), delay)
    return () => { active = false; clearTimeout(timer) }
  }, [load, requestKey, delay])
  const current = state.key === requestKey
  return {
    data: current ? state.data : null,
    loading: !current,
    error: current ? state.error : '',
    retry: () => setRevision(value => value + 1),
  }
}
