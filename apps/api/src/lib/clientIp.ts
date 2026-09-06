import type { Request } from 'express';

/**
 * Resolve the real client address behind the proxy chain.
 *
 * Requests reach Express through two hops:
 *
 *     client → Cloudflare edge → nginx (host) → container (Express)
 *
 * so the socket peer is always nginx on the Docker bridge (172.17.0.1). Keying
 * anything on `req.ip` without configuring `trust proxy` therefore lumps every
 * user in the world into a single bucket — which is exactly what the rate
 * limiters did until this existed. See Known Issues item 4 in project-context.md.
 *
 * Order of preference:
 *
 *  1. `CF-Connecting-IP` — set by Cloudflare to the true client address, and it
 *     *overwrites* whatever the client sent, so it cannot be poisoned through
 *     the edge.
 *  2. The left-most `X-Forwarded-For` entry — correct if Cloudflare is ever
 *     removed and nginx is the only proxy.
 *  3. `req.ip` — with `trust proxy` configured in app.ts this is already
 *     correct; the explicit checks above just make the intent legible.
 *
 * ⚠️ Both headers are only trustworthy while traffic *must* pass through the
 * proxies. Anyone who reaches the origin directly can forge them and rotate
 * their way around the limiter. Closing that off is an infrastructure job:
 * restrict the EC2 security group on 80/443 to Cloudflare's published ranges.
 * Until then this is a large improvement, not an airtight control.
 */
export function getClientIp(req: Request): string {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return normalizeIp(cfIp.trim());
    }

    const forwarded = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (typeof forwardedValue === 'string' && forwardedValue.trim()) {
        // "client, proxy1, proxy2" — the original client is left-most.
        const first = forwardedValue.split(',')[0]?.trim();
        if (first) return normalizeIp(first);
    }

    return normalizeIp(req.ip || req.socket.remoteAddress || 'unknown');
}

/**
 * Collapse IPv4-mapped IPv6 form so one client is one bucket.
 * `::ffff:1.2.3.4` and `1.2.3.4` are the same person.
 */
function normalizeIp(ip: string): string {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
