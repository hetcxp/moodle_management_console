export async function fetchAllPaginated(fetchFn, { perpage = 100 } = {}) {
  let allData = [];
  let page = 0;
  while (true) {
    const res = await fetchFn({ page, perpage });
    const dataArray = Array.isArray(res) ? res : Object.values(res).find(v => Array.isArray(v)) || [];
    
    if (dataArray.length === 0) break;
    
    allData = [...allData, ...dataArray];
    
    if (dataArray.length < perpage) break;
    
    page++;
  }
  return allData;
}
