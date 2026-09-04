export async function runWithConcurrency(items, concurrency, fn) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    p.catch(() => {}); // Prevent unhandled rejection in event loop before Promise.all
    results.push(p);

    if (items.length > concurrency) {
      executing.add(p);
      const clean = () => executing.delete(p);
      p.then(clean, clean);

      if (executing.size >= concurrency) {
        await Promise.race(executing).catch(() => {});
      }
    }
  }

  return Promise.all(results);
}
