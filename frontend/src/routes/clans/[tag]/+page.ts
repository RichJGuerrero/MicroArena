export async function load({ params, fetch }) {
	const res = await fetch(`/api/clans/${params.tag}`);
	const data = await res.json();

	if (!res.ok) {
		return {
			clan: null,
			error: data.error ?? 'Failed to load clan'
		};
	}

	return {
		clan: data.clan,
		error: null
	};
}
