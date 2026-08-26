# Matriks Migrasi SvelteKit API

Dokumen ini dibuat dari registrasi hook aktual. Status hanya boleh dinaikkan setelah endpoint, pemanggil frontend, dan verifikasi terkait selesai.

## Ringkasan

- Total item: 106
- BLOCKED_AUTOMATION: 2
- SELESAI_LOKAL: 104

## Arti status

- `BELUM`: masih bergantung pada `pb_hooks`.
- `DALAM_PROSES`: fondasi atau sebagian jalur sudah dipindahkan, tetapi parity belum lengkap.
- `SELESAI_LOKAL`: endpoint dan pemanggil sudah dipindahkan serta build lokal lulus.
- `SELESAI_REMOTE`: local suite dan E2E remote lulus.
- `BLOCKED_AUTOMATION`: membutuhkan runtime scheduler yang belum dipilih.

## Daftar

| No | Hook lama | Jenis | Method atau event | Path atau job | Risiko | Status |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `activity-evidence.pb.js` | Endpoint | `POST` | `/api/pfriends/activity-submissions/{id}/start-review` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 2 | `activity-evidence.pb.js` | Endpoint | `POST` | `/api/pfriends/activity-submissions/{id}/review` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 3 | `activity-evidence.pb.js` | Lifecycle | `onRecordCreateRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 4 | `activity-evidence.pb.js` | Lifecycle | `onRecordUpdateRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 5 | `activity-evidence.pb.js` | Lifecycle | `onRecordAfterCreateSuccess` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 6 | `activity-evidence.pb.js` | Lifecycle | `onRecordAfterUpdateSuccess` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 7 | `admin-awardees.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/awardees` | Rendah atau sedang | **SELESAI_LOKAL** |
| 8 | `admin-awardees.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/awardees/{id}/history` | Rendah atau sedang | **SELESAI_LOKAL** |
| 9 | `admin-awardees.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/awardees/{id}/account-status` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 10 | `admin-awardees.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/awardees/{id}/membership-status` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 11 | `admin-awardees.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/awardees/{id}/impersonate` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 12 | `admin-awardees.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/impersonations/{id}/end` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 13 | `admin-awardees.pb.js` | Endpoint | `GET` | `/api/pfriends/session/me` | Rendah atau sedang | **SELESAI_LOKAL** |
| 14 | `admin-awardees.pb.js` | Lifecycle | `onRecordAuthRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 15 | `admin-dashboard.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/dashboard` | Rendah atau sedang | **SELESAI_LOKAL** |
| 16 | `admin-stories.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/stories` | Rendah atau sedang | **SELESAI_LOKAL** |
| 17 | `admin-stories.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/stories/{id}` | Rendah atau sedang | **SELESAI_LOKAL** |
| 18 | `awardee-directory.pb.js` | Endpoint | `GET` | `/api/pfriends/directory` | Rendah atau sedang | **SELESAI_LOKAL** |
| 19 | `awardee-profile.pb.js` | Endpoint | `GET` | `/api/pfriends/profile/me` | Rendah atau sedang | **SELESAI_LOKAL** |
| 20 | `awardee-profile.pb.js` | Endpoint | `PATCH` | `/api/pfriends/profile/me` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 21 | `awardee-profile.pb.js` | Endpoint | `POST` | `/api/pfriends/profile/consents/{type}/grant` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 22 | `awardee-profile.pb.js` | Endpoint | `POST` | `/api/pfriends/profile/consents/{type}/revoke` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 23 | `awardee-profile.pb.js` | Endpoint | `POST` | `/api/pfriends/profile/products` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 24 | `awardee-profile.pb.js` | Endpoint | `PATCH` | `/api/pfriends/profile/products/{id}` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 25 | `awardee-profile.pb.js` | Endpoint | `DELETE` | `/api/pfriends/profile/products/{id}` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 26 | `awardee-registration.pb.js` | Endpoint | `POST` | `/api/pfriends/registrations` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 27 | `awardee-registration.pb.js` | Endpoint | `PATCH` | `/api/pfriends/registrations/me` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 28 | `awardee-registration.pb.js` | Endpoint | `POST` | `/api/pfriends/registrations/{id}/decision` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 29 | `awardee-registration.pb.js` | Lifecycle | `onRecordAuthWithPasswordRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 30 | `broadcasts.pb.js` | Endpoint | `GET` | `/api/pfriends/broadcasts` | Rendah atau sedang | **SELESAI_LOKAL** |
| 31 | `broadcasts.pb.js` | Endpoint | `POST` | `/api/pfriends/broadcasts/{id}/start` | Sedang | **SELESAI_LOKAL** |
| 32 | `broadcasts.pb.js` | Endpoint | `POST` | `/api/pfriends/broadcasts/{id}/engage` | Sedang | **SELESAI_LOKAL** |
| 33 | `broadcasts.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/broadcasts` | Rendah atau sedang | **SELESAI_LOKAL** |
| 34 | `broadcasts.pb.js` | Endpoint | `GET` | `/api/pfriends/verifier/broadcasts` | Rendah atau sedang | **SELESAI_LOKAL** |
| 35 | `broadcasts.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/broadcasts` | Sedang | **SELESAI_LOKAL** |
| 36 | `broadcasts.pb.js` | Endpoint | `PATCH` | `/api/pfriends/admin/broadcasts/{id}` | Sedang | **SELESAI_LOKAL** |
| 37 | `broadcasts.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/broadcasts/{id}/publish` | Sedang | **SELESAI_LOKAL** |
| 38 | `broadcasts.pb.js` | Endpoint | `DELETE` | `/api/pfriends/admin/broadcasts/{id}` | Sedang | **SELESAI_LOKAL** |
| 39 | `broadcasts.pb.js` | Cron | `CRON` | `pfriends-publish-broadcasts` | Tidak ada scheduler sesuai keputusan saat ini | **BLOCKED_AUTOMATION** |
| 40 | `calendar-events.pb.js` | Endpoint | `GET` | `/api/pfriends/events` | Rendah atau sedang | **SELESAI_LOKAL** |
| 41 | `calendar-events.pb.js` | Endpoint | `POST` | `/api/pfriends/events` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 42 | `calendar-events.pb.js` | Endpoint | `POST` | `/api/pfriends/events/{id}/decision` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 43 | `calendar-events.pb.js` | Endpoint | `PATCH` | `/api/pfriends/events/{id}` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 44 | `calendar-events.pb.js` | Endpoint | `POST` | `/api/pfriends/events/{id}/transition` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 45 | `calendar-events.pb.js` | Endpoint | `POST` | `/api/pfriends/events/{id}/register` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 46 | `forum.pb.js` | Endpoint | `GET` | `/api/pfriends/forum/channels` | Rendah atau sedang | **SELESAI_LOKAL** |
| 47 | `forum.pb.js` | Endpoint | `GET` | `/api/pfriends/forum/channels/{slug}/messages` | Rendah atau sedang | **SELESAI_LOKAL** |
| 48 | `forum.pb.js` | Endpoint | `GET` | `/api/pfriends/forum/messages/{id}/context` | Rendah atau sedang | **SELESAI_LOKAL** |
| 49 | `forum.pb.js` | Endpoint | `POST` | `/api/pfriends/forum/channels/{slug}/messages` | Sedang | **SELESAI_LOKAL** |
| 50 | `forum.pb.js` | Endpoint | `POST` | `/api/pfriends/forum/messages/{id}/reaction` | Sedang | **SELESAI_LOKAL** |
| 51 | `forum.pb.js` | Endpoint | `DELETE` | `/api/pfriends/forum/messages/{id}` | Sedang | **SELESAI_LOKAL** |
| 52 | `forum.pb.js` | Endpoint | `POST` | `/api/pfriends/forum/presence/heartbeat` | Sedang | **SELESAI_LOKAL** |
| 53 | `forum.pb.js` | Endpoint | `GET` | `/api/pfriends/forum/presence` | Rendah atau sedang | **SELESAI_LOKAL** |
| 54 | `forum.pb.js` | Realtime | `onRealtimeSubscribeRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 55 | `gamification-rules.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/gamification/rules` | Rendah atau sedang | **SELESAI_LOKAL** |
| 56 | `gamification-rules.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/gamification/tiers/preview` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 57 | `gamification-rules.pb.js` | Endpoint | `PUT` | `/api/pfriends/admin/gamification/tiers` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 58 | `gamification-rules.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/gamification/tiers/audit` | Rendah atau sedang | **SELESAI_LOKAL** |
| 59 | `movements.pb.js` | Endpoint | `GET` | `/api/pfriends/movements` | Rendah atau sedang | **SELESAI_LOKAL** |
| 60 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movements` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 61 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movements/{id}/join` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 62 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movements/{id}/resubmit` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 63 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movements/{id}/reports` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 64 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movements/{id}/action-reports` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 65 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/movement-reports/{id}/resubmit` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 66 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/movements/{id}/decision` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 67 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/movement-reports/{id}/start-review` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 68 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/movement-reports/{id}/decision` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 69 | `movements.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/movements/{id}/complete` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 70 | `point-actions.pb.js` | Endpoint | `GET` | `/api/pfriends/point-actions` | Rendah atau sedang | **SELESAI_LOKAL** |
| 71 | `point-actions.pb.js` | Endpoint | `POST` | `/api/pfriends/staff/point-actions` | Sedang | **SELESAI_LOKAL** |
| 72 | `point-actions.pb.js` | Endpoint | `PATCH` | `/api/pfriends/staff/point-actions/{id}` | Sedang | **SELESAI_LOKAL** |
| 73 | `point-actions.pb.js` | Endpoint | `DELETE` | `/api/pfriends/staff/point-actions/{id}` | Sedang | **SELESAI_LOKAL** |
| 74 | `point-actions.pb.js` | Endpoint | `GET` | `/api/pfriends/staff/point-actions/{id}/audit` | Rendah atau sedang | **SELESAI_LOKAL** |
| 75 | `profile-consent-expiry.pb.js` | Cron | `CRON` | `profile-consent-expiry` | Tidak ada scheduler sesuai keputusan saat ini | **BLOCKED_AUTOMATION** |
| 76 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/stories` | Rendah atau sedang | **SELESAI_LOKAL** |
| 77 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/stories/{slug}` | Rendah atau sedang | **SELESAI_LOKAL** |
| 78 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/leaderboard` | Rendah atau sedang | **SELESAI_LOKAL** |
| 79 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/communities` | Rendah atau sedang | **SELESAI_LOKAL** |
| 80 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/movements` | Rendah atau sedang | **SELESAI_LOKAL** |
| 81 | `public-content.pb.js` | Endpoint | `GET` | `/api/pfriends/public/impact` | Rendah atau sedang | **SELESAI_LOKAL** |
| 82 | `reward-redemptions.pb.js` | Endpoint | `GET` | `/api/pfriends/achievements` | Rendah atau sedang | **SELESAI_LOKAL** |
| 83 | `reward-redemptions.pb.js` | Endpoint | `POST` | `/api/pfriends/redemptions` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 84 | `reward-redemptions.pb.js` | Endpoint | `GET` | `/api/pfriends/admin/redemptions` | Rendah atau sedang | **SELESAI_LOKAL** |
| 85 | `reward-redemptions.pb.js` | Endpoint | `POST` | `/api/pfriends/admin/redemptions/{id}/transition` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 86 | `reward-redemptions.pb.js` | Endpoint | `GET` | `/api/pfriends/staff/rewards` | Rendah atau sedang | **SELESAI_LOKAL** |
| 87 | `reward-redemptions.pb.js` | Endpoint | `POST` | `/api/pfriends/staff/rewards` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 88 | `reward-redemptions.pb.js` | Endpoint | `PATCH` | `/api/pfriends/staff/rewards/{id}` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 89 | `reward-redemptions.pb.js` | Endpoint | `DELETE` | `/api/pfriends/staff/rewards/{id}` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 90 | `server-gamification.pb.js` | Endpoint | `GET` | `/api/pfriends/gamification/me` | Rendah atau sedang | **SELESAI_LOKAL** |
| 91 | `server-gamification.pb.js` | Endpoint | `GET` | `/api/pfriends/gamification/leaderboard` | Rendah atau sedang | **SELESAI_LOKAL** |
| 92 | `server-gamification.pb.js` | Endpoint | `GET` | `/api/pfriends/verifier/dashboard` | Rendah atau sedang | **SELESAI_LOKAL** |
| 93 | `server-gamification.pb.js` | Endpoint | `POST` | `/api/pfriends/point-activities/{id}/revoke` | Sedang | **SELESAI_LOKAL** |
| 94 | `server-gamification.pb.js` | Lifecycle | `onRecordAfterCreateSuccess` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |
| 95 | `stories.pb.js` | Endpoint | `GET` | `/api/pfriends/stories/mine` | Rendah atau sedang | **SELESAI_LOKAL** |
| 96 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/stories/drafts` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 97 | `stories.pb.js` | Endpoint | `PATCH` | `/api/pfriends/stories/{id}/draft` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 98 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/stories/{id}/submit` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 99 | `stories.pb.js` | Endpoint | `GET` | `/api/pfriends/verifier/stories` | Rendah atau sedang | **SELESAI_LOKAL** |
| 100 | `stories.pb.js` | Endpoint | `GET` | `/api/pfriends/verifier/stories/{id}` | Rendah atau sedang | **SELESAI_LOKAL** |
| 101 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/stories/{id}/start-review` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 102 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/stories/{id}/decision` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 103 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/stories/{id}/publish` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 104 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/verifier/stories/{id}/archive` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 105 | `stories.pb.js` | Endpoint | `POST` | `/api/pfriends/stories/consent/revoke` | Kritis, batch wajib | **SELESAI_LOKAL** |
| 106 | `stories.pb.js` | Lifecycle | `onRecordViewRequest` | `-` | Tinggi, jalur write atau subscription langsung harus ditutup | **SELESAI_LOKAL** |

## Blocker aktif

- Dua cron job belum otomatis karena Cloudflare Worker dan GitLab Schedule tidak dipilih.
- Operasi kritis wajib membuktikan PocketBase Batch API aktif sebelum status dapat dinaikkan.
- Realtime Forum memakai subscription collection PocketBase dengan API rule berbasis sesi aktif dan komunitas.
- Tidak ada item yang berstatus `SELESAI_REMOTE` karena production belum diuji dari implementasi ini.
