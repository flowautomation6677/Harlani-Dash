async function test() {
  try {
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01T00:00:00Z`;
    // Test with $skip
    const query = new URLSearchParams({ '$filter': `dueDate ge ${startDate}`, '$top': '50', '$skip': '0' }).toString();
    
    console.log("Query:", query);
    const res = await fetch(`http://localhost:3000/api/nibo/schedules/credit?${query}`);
    
    if (!res.ok) {
      console.log("Error status:", res.status);
      const text = await res.text();
      console.log("Error body:", text);
      return;
    }
    
    const data = await res.json();
    console.log("CREDITS length:", data.items ? data.items.length : data);
  } catch(e) {
    console.error(e);
  }
}
test();
