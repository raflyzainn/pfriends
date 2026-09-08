export function pfWeek(value) {
	const date = new Date(value);
	const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	const day = Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
	return Math.floor((day - 5) / 7);
}

export function wibDay(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	return Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
}

export function dailyStreakOf(entries, now = new Date()) {
	const today = wibDay(now);
	const days = [...new Set(entries
		.filter((row) => Number(row.points) > 0)
		.map((row) => wibDay(row.awardedAt))
		.filter((day) => day !== null && day <= today))].sort((a, b) => a - b);
	let longest = 0, run = 0, previous = null;
	for (const day of days) {
		run = previous !== null && day === previous + 1 ? run + 1 : 1;
		longest = Math.max(longest, run);
		previous = day;
	}
	if (previous === null || previous < today - 1) return { current: 0, longest, activeToday: false };
	let current = 1;
	for (let index = days.length - 2; index >= 0 && days[index] === days[index + 1] - 1; index--) current++;
	return { current, longest, activeToday: previous === today };
}

export function dailyProfileStatus(profile, now = new Date()) {
	const today = wibDay(now), lastDay = wibDay(profile?.lastPointAwardedAt);
	const activeToday = lastDay !== null && lastDay === today;
	const currentStreakDays = lastDay !== null && lastDay >= today - 1 && lastDay <= today
		? Number(profile?.currentStreakDays || 0)
		: 0;
	return { currentStreakDays, activeToday };
}

export function streakOf(entries, now = new Date()) {
	const weeks = [...new Set(entries.filter((row) => Number(row.points) > 0).map((row) => pfWeek(row.occurredAt)))].sort((a, b) => a - b);
	let longest = 0, run = 0, previous = null;
	for (const week of weeks) { run = previous !== null && week === previous + 1 ? run + 1 : 1; longest = Math.max(longest, run); previous = week; }
	const currentWeek = pfWeek(now);
	if (previous === null || previous < currentWeek - 1) return { current: 0, longest };
	let current = 1;
	for (let index = weeks.length - 2; index >= 0 && weeks[index] === weeks[index + 1] - 1; index--) current++;
	return { current, longest };
}
