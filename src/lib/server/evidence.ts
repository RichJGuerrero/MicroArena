// Evidence helpers
// V1 (pre-upload): validate and normalize evidence URLs for disputes.
// - https-only
// - allowlist domains: YouTube, Twitch Clips/VOD, Streamable, Imgur

export type EvidenceProvider = 'YOUTUBE' | 'TWITCH' | 'STREAMABLE' | 'IMGUR';

export interface EvidenceUrlInfo {
	provider: EvidenceProvider;
	normalizedUrl: string;
}

function hostOf(u: URL): string {
	return (u.hostname || '').toLowerCase();
}

function stripWww(host: string): string {
	return host.startsWith('www.') ? host.slice(4) : host;
}

function isAllowedHost(host: string, allowed: string[]): boolean {
	const h = stripWww(host);
	return allowed.some((a) => {
		const aa = stripWww(a.toLowerCase());
		return h === aa || h.endsWith(`.${aa}`);
	});
}

export function validateEvidenceUrl(raw: string): EvidenceUrlInfo {
	const input = (raw ?? '').trim();
	if (!input) throw new Error('Evidence URL is required');

	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new Error('Evidence URL must be a valid https link');
	}

	if (url.protocol !== 'https:') {
		throw new Error('Evidence URL must use https');
	}

	const host = hostOf(url);

	// YouTube
	if (isAllowedHost(host, ['youtube.com', 'youtu.be'])) {
		// Normalize by removing tracking junk.
		url.searchParams.delete('utm_source');
		url.searchParams.delete('utm_medium');
		url.searchParams.delete('utm_campaign');
		url.searchParams.delete('utm_term');
		url.searchParams.delete('utm_content');
		return { provider: 'YOUTUBE', normalizedUrl: url.toString() };
	}

	// Twitch (clips + vods)
	if (isAllowedHost(host, ['twitch.tv', 'clips.twitch.tv'])) {
		url.searchParams.delete('tt_medium');
		url.searchParams.delete('tt_content');
		return { provider: 'TWITCH', normalizedUrl: url.toString() };
	}

	// Streamable
	if (isAllowedHost(host, ['streamable.com'])) {
		return { provider: 'STREAMABLE', normalizedUrl: url.toString() };
	}

	// Imgur
	if (isAllowedHost(host, ['imgur.com', 'i.imgur.com'])) {
		return { provider: 'IMGUR', normalizedUrl: url.toString() };
	}

	throw new Error('Evidence URL must be from YouTube, Twitch, Streamable, or Imgur (https only)');
}
