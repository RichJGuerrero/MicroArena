import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { adminResolveArenaMatch, createIntegrityEvent, getArenaMatch } from '$lib/server/store';
import type { ArenaSideKey, IntegrityEventType } from '$lib/types';

type IntegrityAction = {
	targetUserId: string;
	type: IntegrityEventType;
	severity: number;
	description: string;
};

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	try {
		requireAdmin(cookies);
		const id = (params.id ?? '').trim();
		if (!id) return json({ success: false, error: 'Match id required' }, { status: 400 });

		const body = await request.json();
		const winnerSide = (body?.winnerSide ?? '').toString().trim() as ArenaSideKey;
		const scoreA = body?.scoreA;
		const scoreB = body?.scoreB;
		const resolutionNote = (body?.resolutionNote ?? '').toString();
		const integrityActions = (body?.integrityActions ?? []) as IntegrityAction[];

		if (winnerSide !== 'A' && winnerSide !== 'B') {
			return json({ success: false, error: 'winnerSide must be A or B' }, { status: 400 });
		}

		const before = getArenaMatch(id);
		if (!before) return json({ success: false, error: 'Match not found' }, { status: 404 });

		const resolved = adminResolveArenaMatch(id, {
			winnerSide,
			scoreA: typeof scoreA === 'number' ? scoreA : undefined,
			scoreB: typeof scoreB === 'number' ? scoreB : undefined,
			resolutionNote
		});

		// Optional integrity actions (applied AFTER resolution)
		if (Array.isArray(integrityActions) && integrityActions.length > 0) {
			const participantSet = new Set<string>([...before.teamA.playerIds, ...before.teamB.playerIds]);
			for (const action of integrityActions) {
				const targetUserId = (action?.targetUserId ?? '').trim();
				if (!targetUserId || !participantSet.has(targetUserId)) continue;
				const severity = Math.max(1, Math.min(5, Number(action?.severity ?? 1)));
				const type = action?.type;
				const description = (action?.description ?? '').toString().trim() || 'Admin action';
				if (!type) continue;
				try {
					createIntegrityEvent({
						targetUserId,
						type,
						severity,
						description,
						reportedBy: 'ADMIN',
						matchId: id
					});
				} catch {
					// ignore individual failures so a single bad payload doesn't block resolution
				}
			}
		}

		return json({ success: true, data: resolved });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to resolve match';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
