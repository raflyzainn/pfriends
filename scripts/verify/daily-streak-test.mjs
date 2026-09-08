import { dailyProfileStatus, dailyStreakOf, wibDay } from '../../src/lib/server/streak.js';

let passed = 0;
function expect(value, message) {
	if (!value) throw new Error(message);
	passed++;
}

const now = new Date('2026-08-27T12:00:00+07:00');
const entry = (awardedAt, points = 1, occurredAt = '2026-01-01T00:00:00Z') => ({ awardedAt, occurredAt, points });

expect(wibDay('2026-08-26T17:00:00Z') === wibDay('2026-08-27T16:59:59+07:00'), 'Batas tanggal WIB dimulai pukul 00.00 WIB.');

const active = dailyStreakOf([
	entry('2026-08-25T08:00:00+07:00'),
	entry('2026-08-26T09:00:00+07:00'),
	entry('2026-08-27T07:00:00+07:00'),
	entry('2026-08-27T11:00:00+07:00'),
	entry('2026-08-24T09:00:00+07:00', 0)
], now);
expect(active.current === 3 && active.longest === 3 && active.activeToday, 'Beberapa poin pada hari yang sama hanya menambah satu hari streak.');

const grace = dailyStreakOf([
	entry('2026-08-25T09:00:00+07:00'),
	entry('2026-08-26T09:00:00+07:00')
], now);
expect(grace.current === 2 && !grace.activeToday, 'Streak kemarin tetap dapat dilanjutkan sampai akhir hari ini.');

const broken = dailyStreakOf([
	entry('2026-08-22T09:00:00+07:00'),
	entry('2026-08-23T09:00:00+07:00'),
	entry('2026-08-24T09:00:00+07:00')
], now);
expect(broken.current === 0 && broken.longest === 3 && !broken.activeToday, 'Jeda lebih dari satu hari mereset streak berjalan tanpa menghapus rekor.');

const monthBoundary = dailyStreakOf([
	entry('2026-07-31T23:30:00+07:00'),
	entry('2026-08-01T00:30:00+07:00'),
	entry('2026-08-02T20:00:00+07:00')
], new Date('2026-08-02T22:00:00+07:00'));
expect(monthBoundary.current === 3 && monthBoundary.longest === 3, 'Streak berlanjut melewati pergantian bulan.');

const awardedDateWins = dailyStreakOf([
	entry('2026-08-26T10:00:00+07:00', 5, '2026-07-01T10:00:00+07:00'),
	entry('2026-08-27T10:00:00+07:00', 5, '2026-01-01T10:00:00+07:00')
], now);
expect(awardedDateWins.current === 2 && awardedDateWins.activeToday, 'Streak memakai tanggal poin masuk, bukan tanggal kegiatan.');

const futureIgnored = dailyStreakOf([entry('2026-08-28T08:00:00+07:00')], now);
expect(futureIgnored.current === 0 && futureIgnored.longest === 0, 'Poin bertanggal masa depan tidak dihitung.');

expect(JSON.stringify(dailyStreakOf([], now)) === JSON.stringify({ current: 0, longest: 0, activeToday: false }), 'Ledger kosong menghasilkan streak nol.');
expect(JSON.stringify(dailyProfileStatus({ currentStreakDays: 4, lastPointAwardedAt: '2026-08-26T10:00:00+07:00' }, now)) === JSON.stringify({ currentStreakDays: 4, activeToday: false }), 'Proyeksi kemarin tetap hidup tetapi belum aktif hari ini.');
expect(JSON.stringify(dailyProfileStatus({ currentStreakDays: 4, lastPointAwardedAt: '2026-08-24T10:00:00+07:00' }, now)) === JSON.stringify({ currentStreakDays: 0, activeToday: false }), 'Proyeksi lama dinolkan saat dibaca tanpa menunggu cron.');

console.log(`Daily point streak: ${passed} asersi lulus.`);
