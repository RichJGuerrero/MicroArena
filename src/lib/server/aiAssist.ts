import type { ArenaAiAssist, ArenaEvidenceItem, ArenaMatch, AiFlag, AiProviderKey } from '$lib/types';

function clamp01(n: number) {
	if (Number.isNaN(n)) return 0;
	return Math.max(0, Math.min(1, n));
}

function now() {
	return Date.now();
}

function countBySide(evidence: ArenaEvidenceItem[]) {
	const a = evidence.filter((e) => e?.side === 'A');
	const b = evidence.filter((e) => e?.side === 'B');
	return { a, b };
}

function providerBreakdown(evidence: ArenaEvidenceItem[]) {
	const counts: Record<string, number> = {};
	for (const e of evidence) {
		const key = (e?.provider ?? 'OTHER').toString();
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}

function summarizeProviders(counts: Record<string, number>) {
	const parts = Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([k, v]) => `${k}:${v}`);
	return parts.join(', ');
}

function buildMockAssist(match: ArenaMatch): ArenaAiAssist {
	const evidence = Array.isArray((match as any).evidence) ? ((match as any).evidence as ArenaEvidenceItem[]) : [];
	const { a, b } = countBySide(evidence);
	const total = evidence.length;
	const flags: AiFlag[] = [];

	if (match.status === 'DISPUTED') {
		if (total === 0) {
			flags.push({ code: 'NO_EVIDENCE', severity: 'HIGH', message: 'No evidence submitted. Ref decision will be slower / lower confidence.' });
		} else {
			if (a.length === 0 || b.length === 0) {
				flags.push({
					code: 'ONE_SIDED_EVIDENCE',
					severity: 'MED',
					message: `Evidence is one-sided (${a.length} from A, ${b.length} from B). Consider requesting the missing side to submit proof.`
				});
			}
		}
	}

	// Light heuristics: "OTHER" provider and missing notes are mildly suspicious (not "cheating", just lower clarity).
	const otherCount = evidence.filter((e) => (e?.provider ?? 'OTHER') === 'OTHER').length;
	if (otherCount > 0) {
		flags.push({ code: 'UNVERIFIED_PROVIDER', severity: 'LOW', message: `Some evidence links are from unrecognized providers (OTHER:${otherCount}).` });
	}
	const noNoteCount = evidence.filter((e) => !((e?.note ?? '').trim())).length;
	if (total > 0 && noNoteCount === total) {
		flags.push({ code: 'NO_CONTEXT_NOTES', severity: 'LOW', message: 'No evidence notes were provided. Short notes help refs locate key moments faster.' });
	}

	const counts = providerBreakdown(evidence);
	const providerSummary = total > 0 ? summarizeProviders(counts) : 'none';
	const dispute = match.status === 'DISPUTED' ? (match.disputeReason ?? 'Conflicting reports') : match.status;

	const summary =
		total === 0
			? `Dispute context: ${dispute}. No evidence submitted yet.`
			: `Dispute context: ${dispute}. Evidence total ${total} (A:${a.length}, B:${b.length}). Providers: ${providerSummary}.`;

	// Score is not a verdict. It's just "how much material exists".
	let score = 0.15;
	if (total > 0) score = 0.35;
	if (a.length > 0 && b.length > 0) score = 0.55;
	if (a.length >= 2 && b.length >= 2) score = 0.7;
	if (a.length >= 3 && b.length >= 3) score = 0.8;

	return {
		provider: 'MOCK',
		model: null,
		summary,
		flags,
		score: clamp01(score),
		updatedAt: now(),
		error: null
	};
}

async function buildOpenAiAssist(match: ArenaMatch): Promise<ArenaAiAssist> {
	// NOTE: This is a thin integration point. We can swap providers later.
	// If env vars are missing, we fall back to MOCK.
	const apiKey = (process.env.OPENAI_API_KEY ?? '').trim();
	const model = (process.env.OPENAI_MODEL ?? '').trim();
	if (!apiKey || !model) return buildMockAssist(match);

	const evidence = Array.isArray((match as any).evidence) ? ((match as any).evidence as ArenaEvidenceItem[]) : [];
	const payload = {
		model,
		input: [
			{
				role: 'system',
				content:
					'You are an assistant helping human referees resolve competitive match disputes. You must be neutral. You do not decide winners. You summarize evidence and raise non-accusatory flags.'
			},
			{
				role: 'user',
				content: JSON.stringify(
					{
						match: {
							id: match.id,
							status: match.status,
							disputeReason: match.disputeReason,
							reportA: match.reportA,
							reportB: match.reportB,
							format: match.format,
							scope: match.scope,
							queue: match.queue
						},
						evidence
					},
					null,
					2
				)
			}
		],
		// Ask for a tiny JSON object so we can parse reliably.
		text: {
			format: {
				type: 'json_schema',
				json_schema: {
					name: 'ref_assist',
					schema: {
						type: 'object',
						additionalProperties: false,
						properties: {
							summary: { type: 'string' },
							flags: {
								type: 'array',
								items: {
									type: 'object',
									additionalProperties: false,
									properties: {
										code: { type: 'string' },
										severity: { type: 'string' },
										message: { type: 'string' }
									},
									required: ['code', 'severity', 'message']
								}
							},
							score: { type: ['number', 'null'] }
						},
						required: ['summary', 'flags', 'score']
					}
				}
			}
		}
	};

	try {
		const res = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(payload)
		});
		const data = (await res.json()) as any;
		if (!res.ok) {
			const msg = (data?.error?.message ?? data?.error ?? 'OpenAI request failed').toString();
			return { ...buildMockAssist(match), provider: 'OPENAI', model, error: msg };
		}
		// Best-effort extraction: Responses API often returns `output_text`.
		const text = (data?.output_text ?? '').toString().trim();
		if (!text) return { ...buildMockAssist(match), provider: 'OPENAI', model, error: 'Empty AI response' };
		let parsed: any = null;
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = null;
		}
		const flags: AiFlag[] = Array.isArray(parsed?.flags)
			? parsed.flags
				.map((f: any) => ({
					code: (f?.code ?? 'FLAG').toString(),
					severity: ((f?.severity ?? 'LOW').toString().toUpperCase() as any) === 'HIGH' ? 'HIGH' : ((f?.severity ?? 'LOW').toString().toUpperCase() as any) === 'MED' ? 'MED' : 'LOW',
					message: (f?.message ?? '').toString()
				}))
			: [];
		const score = typeof parsed?.score === 'number' ? clamp01(parsed.score) : null;
		const summary = (parsed?.summary ?? '').toString().trim() || buildMockAssist(match).summary;
		return {
			provider: 'OPENAI',
			model,
			summary,
			flags,
			score,
			updatedAt: now(),
			error: null
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'AI provider failed';
		return { ...buildMockAssist(match), provider: 'OPENAI', model, error: msg };
	}
}

export async function runRefAssist(match: ArenaMatch): Promise<ArenaAiAssist> {
	const provider = (process.env.MA_AI_PROVIDER ?? 'mock').toString().trim().toLowerCase();
	if (provider === 'openai') return await buildOpenAiAssist(match);
	if (provider === 'none') {
		return {
			provider: 'NONE',
			model: null,
			summary: 'AI assist is disabled.',
			flags: [],
			score: null,
			updatedAt: now(),
			error: null
		};
	}
	return buildMockAssist(match);
}

export function providerLabel(p: AiProviderKey) {
	if (p === 'OPENAI') return 'OpenAI';
	if (p === 'MOCK') return 'Mock';
	return 'Disabled';
}
