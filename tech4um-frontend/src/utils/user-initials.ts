export const getUserInitials = (username?: string | null): string => {
	const normalizedUsername = username?.trim();

	if (!normalizedUsername) {
		return '??';
	}

	const parts = normalizedUsername.split(/\s+/).filter(Boolean);

	if (parts.length === 0) {
		return '??';
	}

	if (parts.length === 1) {
		const firstPart = parts[0];
		return firstPart ? firstPart.slice(0, 2).toUpperCase() : '??';
	}

	const firstPart = parts[0];
	const lastPart = parts[parts.length - 1];
	const firstInitial = firstPart?.[0] ?? '';
	const lastInitial = lastPart?.[0] ?? '';

	return `${firstInitial}${lastInitial}`.toUpperCase();
};

