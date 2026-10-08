import { useEffect, useState } from 'react'

export function useCatalogResource(load, key) {
  const [revision, setRevision] = useState(0)
  const requestKey = `${key}:${revision}`
  const [state, setState] = useState({ key: null, data: null, error: '' })
  useEffect(() => {
    let active = true
    Promise.resolve().then(load).then(data => {
      if (active) setState({ key: requestKey, data, error: '' })
    }).catch(error => {
      if (active) setState({ key: requestKey, data: null, error: error.message })
    })
    return () => { active = false }
  }, [load, requestKey])
  const current = state.key === requestKey
  return {
    data: current ? state.data : null,
    loading: !current,
    error: current ? state.error : '',
    retry: () => setRevision(value => value + 1),
  }
}
