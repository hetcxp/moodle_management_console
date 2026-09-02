export async function runWithConcurrency(items, concurrency, fn) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    
    if (items.length > concurrency) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  
  return Promise.all(results);
}
