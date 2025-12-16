export async function load({ params, fetch }) {
	const res = await fetch(`/api/users/${params.username}`);
	const data = await res.json();

	if (!res.ok) {
		return {
			user: null,
			error: data.error ?? 'Failed to load user'
		};
	}

	return {
		user: data.user,
		error: null
	};
}
