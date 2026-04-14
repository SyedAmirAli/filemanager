import { networkInterfaces } from 'os';

function collectAddresses(
  family: 'IPv4' | 'IPv6',
  filter: (addr: string) => boolean,
): string[] {
  const nets = networkInterfaces();
  const out: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === family && !net.internal && filter(net.address)) {
        out.push(net.address);
      }
    }
  }
  return [...new Set(out)];
}

/** IPv4 addresses on this machine (non-loopback), for LAN URLs. */
export function getLanIPv4Addresses(): string[] {
  return collectAddresses('IPv4', () => true);
}

/** Non-link-local IPv6 (skips fe80::…), for LAN URLs. */
export function getLanIPv6Addresses(): string[] {
  return collectAddresses('IPv6', (addr) => !addr.toLowerCase().startsWith('fe80:'));
}

/**
 * Optional hostname or IP from env — use when clients reach you via DNS, reverse proxy,
 * or a known static IP. No network I/O (works fully offline).
 *
 * @example PUBLIC_HOST=files.example.com
 * @example PUBLIC_HOST=203.0.113.10
 */
export function getConfiguredAdvertiseHost(): string | null {
  const h =
    process.env.PUBLIC_HOST?.trim() || process.env.ADVERTISE_HOST?.trim();
  return h || null;
}
