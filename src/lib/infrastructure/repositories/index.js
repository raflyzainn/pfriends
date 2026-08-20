/**
 * BARREL REPOSITORY: satu titik impor bagi lapisan store dan service.
 *
 * Repository bersifat tanpa state: seluruhnya hanya membungkus tabel Dexie yang
 * sama. Karena itu instans tunggal per tabel sudah memadai, dan store cukup
 * menyuntikkannya ke service sesuai kontrak Dependency Inversion §5.
 *
 * Barrel ini sekaligus menjadi composition root: store merakit service domain dari
 * instans di sini, sehingga tidak ada berkas `container.js` dan konstruktor
 * berparameter tetap menjadi seam pengujian.
 *
 * @example
 * import { activityRepository, awardeeRepository } from '$lib/infrastructure/repositories/index.js';
 * const engine = new GamificationEngine({ activityRepo: activityRepository });
 */

export { DexieRepository } from './DexieRepository.js';

export { AccountRepository, accountRepository } from './AccountRepository.js';
export { ActivityRepository, activityRepository } from './ActivityRepository.js';
export { AwardeeRepository, awardeeRepository } from './AwardeeRepository.js';
export { BadgeRepository, badgeRepository } from './BadgeRepository.js';
export { BroadcastRepository, broadcastRepository } from './BroadcastRepository.js';
export { ConsentRepository, consentRepository } from './ConsentRepository.js';
export { EventRepository, eventRepository } from './EventRepository.js';
export { MovementRepository, movementRepository } from './MovementRepository.js';
export { RewardRepository, rewardRepository } from './RewardRepository.js';
export { RedemptionStatus, REDEMPTION_STATUS_META } from './redemption-status.js';
export { StoryRepository, storyRepository } from './StoryRepository.js';
