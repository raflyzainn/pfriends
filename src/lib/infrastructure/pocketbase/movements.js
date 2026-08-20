import { getPocketBase, pocketBaseMessage } from './client.js';

function client() { const pb = getPocketBase(); if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.'); return pb; }
async function send(path, options, fallback) { try { return await client().send(path, options); } catch (error) { throw new Error(pocketBaseMessage(error, fallback)); } }
export async function listMovements() { return (await send('/api/pfriends/movements', {}, 'Data Gerakan gagal dimuat.')).items || []; }
export async function proposeMovement(body) { return send('/api/pfriends/movements', { method: 'POST', body }, 'Usulan Gerakan gagal dikirim.'); }
export async function joinMovement(id) { return send(`/api/pfriends/movements/${id}/join`, { method: 'POST' }, 'Pendaftaran Gerakan gagal.'); }
export async function submitMovementReport(id, formData) { return send(`/api/pfriends/movements/${id}/action-reports`, { method: 'POST', body: formData }, 'Laporan aksi gagal dikirim.'); }
export async function decideMovement(id, body) { return send(`/api/pfriends/verifier/movements/${id}/decision`, { method: 'POST', body }, 'Keputusan usulan gagal disimpan.'); }
export async function startMovementReportReview(id) { return send(`/api/pfriends/verifier/movement-reports/${id}/start-review`, { method: 'POST' }, 'Laporan gagal dibuka untuk pemeriksaan.'); }
export async function decideMovementReport(id, body) { return send(`/api/pfriends/verifier/movement-reports/${id}/decision`, { method: 'POST', body }, 'Keputusan laporan gagal disimpan.'); }
export async function completeMovement(id) { return send(`/api/pfriends/verifier/movements/${id}/complete`, { method: 'POST' }, 'Gerakan gagal diselesaikan.'); }
