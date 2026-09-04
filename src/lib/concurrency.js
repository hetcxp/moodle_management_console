export async function runWithConcurrency(items, concurrency, fn) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);

    if (items.length > concurrency) {
      executing.add(p);
      p.finally(() => executing.delete(p));

      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}
