import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The CSP in vercel.json allows the inline theme script in client/index.html by hash.
// If someone edits that script without updating the hash, the live site would lose its theme init.
describe('content security policy', () => {
  it('allows the inline theme script by its current hash', () => {
    const html = readFileSync('client/index.html', 'utf8');
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const hash = createHash('sha256').update(inline).digest('base64');
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const csp = config.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
    expect(csp).toContain(`'sha256-${hash}'`);
  });
});
