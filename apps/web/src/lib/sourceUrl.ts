/**
 * Advisory checks on a scheme's official government source URL.
 *
 * These are warnings, never blocks. The API enforces only that the value is a
 * well-formed https URL; the host is deliberately not enforced there, because a
 * hard `.gov.in` rule would reject an edit to any unrelated field on every
 * existing government scheme until its URL is backfilled, and some legitimate
 * state portals sit on other domains.
 *
 * So this exists to make a questionable URL visible to the admin entering it,
 * while leaving the judgement with them. Tighten into a hard rule once every
 * scheme has one.
 *
 * Context: Google Play flagged the Android app under the Misleading Claims
 * policy for presenting government scheme information without a verifiable
 * source and without a clear "we are not a government entity" statement.
 */

const OFFICIAL_HOST_SUFFIXES = ['.gov.in', '.nic.in', '.gov', '.ac.in'];

export function getSourceUrlWarning(rawUrl: string, schemeType: string): string | null {
    const url = rawUrl.trim();

    if (!url) {
        return schemeType === 'GOVERNMENT'
            ? 'Government schemes should link to their official page. Without one, users see no source at all.'
            : null;
    }

    if (!/^https?:\/\//i.test(url)) {
        return 'Must start with https:// — the API will reject this.';
    }

    if (url.toLowerCase().startsWith('http://')) {
        return 'Must be https:// — an insecure link is presented as authoritative.';
    }

    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return 'This does not look like a valid URL.';
    }

    if (schemeType === 'GOVERNMENT' && !OFFICIAL_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
        return `"${host}" is not a .gov.in / .nic.in domain. Double-check this is the official page and not a news article or aggregator.`;
    }

    return null;
}

/**
 * True when a scheme is presented as a government scheme but has no source
 * recorded. Used to flag rows in the admin scheme list so the backfill is
 * trackable rather than a spreadsheet exercise.
 */
export function isMissingGovernmentSource(
    scheme: { schemeType?: string | null; sourceUrl?: string | null },
): boolean {
    return scheme.schemeType === 'GOVERNMENT' && !scheme.sourceUrl;
}
