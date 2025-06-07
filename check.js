const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent'); // Correct constructor import
const fs = require('fs');

const testUrl = 'http://www.technologymanias.com';
const CONCURRENT_LIMIT = 20;
const proxies = [];

async function checkProxy(proxy) {
  const trimmed = proxy.trim();
  const agent = new HttpProxyAgent(`http://${trimmed}`);

  try {
    const start = Date.now();
    const response = await axios.get(testUrl, {
      httpAgent: agent,
      timeout: 5000,
    });
    const end = Date.now();
    const latency = end - start;

    if (response.status === 200) {
      console.log(`✅ Working: ${trimmed} → IP: ${response.data.origin} → Latency: ${latency} ms`);
      proxies.push(trimmed);
      return true;
    }
  } catch (err) {
    console.log(`❌ Dead: ${trimmed}`);
  }
  return false;
}

async function runChecker() {
  const list = fs.readFileSync('proxies.txt', 'utf-8')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  for (let i = 928; i < list.length; i += CONCURRENT_LIMIT) {
    const batch = list.slice(i, i + CONCURRENT_LIMIT);
    await Promise.all(batch.map(proxy => checkProxy(proxy)));

    if (proxies.length > 0) {
        // Read existing file content (if file doesn't exist, create an empty string)
        let existing = '';
        try {
        existing = fs.readFileSync('working_proxies.txt', 'utf-8');
        } catch (e) {}

        const existingSet = new Set(existing.split('\n').map(p => p.trim()).filter(Boolean));
        const newSet = new Set(proxies);

        // Merge new proxies (avoiding duplicates)
        const updated = Array.from(new Set([...existingSet, ...newSet]));

        // Save back to file
        fs.writeFileSync('working_proxies.txt', updated.join('\n'));

        console.log(`\n✅ Total working proxies so far: ${updated.length}`);
        proxies.length = 0; // Clear the array
    }
    }
}

runChecker();
