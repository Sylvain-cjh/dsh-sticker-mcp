const hosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
export function createBridge(base = process.env.QQ_BRIDGE_URL || 'http://127.0.0.1:3100') {
  const root = new URL(base);
  if (root.protocol !== 'http:' || !hosts.has(root.hostname) || root.username || root.password || root.search || root.hash || root.pathname !== '/') {
    throw new Error('QQ_BRIDGE_URL must be a loopback HTTP origin');
  }
  return async function call(route, { key, token, ...args }, method = 'POST') {
    const url = new URL(route, root);
    if (url.origin !== root.origin) throw new Error('Invalid bridge route');
    const options = { method, redirect: 'error', signal: AbortSignal.timeout(180000), headers: { 'x-agent-token': token } };
    if (method === 'GET') {
      for (const [name, value] of Object.entries({ key, ...args })) if (value !== undefined) url.searchParams.set(name, String(value));
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ key, ...args });
    }
    const response = await fetch(url, options);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 16 * 1024 * 1024) throw new Error('Bridge response exceeds limit');
      chunks.push(chunk);
    }
    let result;
    try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('Bridge returned invalid JSON'); }
    if (!response.ok || result.ok === false) throw new Error(`Bridge rejected request (HTTP ${response.status})`);
    return JSON.parse(JSON.stringify(result, (name, value) => {
      if (/token|password|cookie|secret|api.?key/i.test(name)) return undefined;
      return typeof value === 'string' && token ? value.split(token).join('[REDACTED]') : value;
    }));
  };
}
