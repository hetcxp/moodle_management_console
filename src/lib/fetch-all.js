export async function fetchAllPaginated(fetchFn, { perpage = 100, dataKey = null } = {}) {
  const allData = [];
  let page = 0;
  const MAX_PAGES = 100;

  while (page < MAX_PAGES) {
    const res = await fetchFn({ page, perpage });
    const dataArray = (dataKey && res?.[dataKey] && Array.isArray(res[dataKey]))
      ? res[dataKey]
      : (Array.isArray(res) ? res : Object.values(res).find(v => Array.isArray(v)) || []);

    if (dataArray.length === 0) break;

    allData.push(...dataArray);

    if (res?.totalcount !== undefined && allData.length >= res.totalcount) break;
    if (dataArray.length < perpage) break;

    page++;
  }
  return allData;
}
