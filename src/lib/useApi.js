import { useState, useEffect, useCallback, useRef } from 'react';

const globalCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Custom hook to manage API requests with basic TTL in-memory caching.
 * @param {Function} apiFunction - Promise returning API function (e.g. AdminerApi.getCourses)
 * @param {Array|Object} args - Arguments to pass to the api function
 * @param {Object} options - { key: string, ttl: number }
 */
export function useApi(apiFunction, args = null, options = { key: null, ttl: 120000 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Safe stringify for complex args
  const argsKey = JSON.stringify(args, (k, v) => v === undefined ? null : v);
  const cacheKey = options.key || (apiFunction.name ? `${apiFunction.name}_${argsKey}` : null);

  const fetchData = useCallback(async (force = false) => {
    if (!isMounted.current) return;
    
    if (!force && cacheKey && globalCache.has(cacheKey)) {
      const cached = globalCache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.ttl || 120000)) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = Array.isArray(args) ? await apiFunction(...args) : await apiFunction(args || {});
      if (isMounted.current) {
        setData(res);
        if (cacheKey) {
          if (globalCache.size >= MAX_CACHE_SIZE) {
            const firstKey = globalCache.keys().next().value;
            globalCache.delete(firstKey);
          }
          globalCache.set(cacheKey, { data: res, timestamp: Date.now() });
        }
      }
      return res;
    } catch (err) {
      if (isMounted.current) setError(err);
      throw err;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [apiFunction, argsKey, cacheKey, options.ttl]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [fetchData]);

  return { data, setData, loading, error, refetch: () => fetchData(true) };
}

export function clearApiCache(keyPrefix = '') {
  if (!keyPrefix) {
    globalCache.clear();
  } else {
    for (const key of globalCache.keys()) {
      if (key.startsWith(keyPrefix)) globalCache.delete(key);
    }
  }
}
