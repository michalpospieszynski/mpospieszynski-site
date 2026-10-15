import { addNonce, contentSecurityPolicy } from './server-security';

const SUPABASE = 'https://abc.supabase.co';

function directive(csp: string, name: string): string {
  return csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
}

describe('contentSecurityPolicy', () => {
  it('allows Turnstile only on the pages with the contact form', () => {
    for (const path of ['/kontakt', '/en/contact', '/kontakt/', '/', '/en']) {
      const csp = contentSecurityPolicy(path, 'n', SUPABASE);
      expect(directive(csp, 'script-src')).toContain('https://challenges.cloudflare.com');
      expect(directive(csp, 'frame-src')).toBe('frame-src https://challenges.cloudflare.com');
    }
    const projects = contentSecurityPolicy('/projekty', 'n', SUPABASE);
    expect(projects).not.toContain('challenges.cloudflare.com');
    expect(directive(projects, 'frame-src')).toBe("frame-src 'none'");
  });

  it('allows Supabase Auth only in the admin', () => {
    expect(
      directive(contentSecurityPolicy('/admin/projekty', 'n', SUPABASE), 'connect-src'),
    ).toContain(SUPABASE);
    expect(contentSecurityPolicy('/en', 'n', SUPABASE)).not.toContain(SUPABASE);
    expect(contentSecurityPolicy('/administrator', 'n', SUPABASE)).not.toContain(SUPABASE);
  });

  it('uses the nonce, never unsafe-inline or eval for scripts, and forbids framing', () => {
    const csp = contentSecurityPolicy('/', 'abc', SUPABASE);
    const script = directive(csp, 'script-src');
    expect(script).toContain("'nonce-abc'");
    expect(script).not.toContain('unsafe');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('addNonce', () => {
  it('adds the nonce to every script once', () => {
    const html =
      '<script>a()</script><script src="/main.js" type="module"></script><script nonce="x">b()</script>';
    expect(addNonce(html, 'n1')).toBe(
      '<script nonce="n1">a()</script><script nonce="n1" src="/main.js" type="module"></script><script nonce="x">b()</script>',
    );
  });
});
