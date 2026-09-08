import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { recordId, text } from '../registration.js';

function dto(row) {
	return { id: row.id, code: row.code, label: row.label, description: row.description, actionClass: row.actionClass, pillar: row.pillar, points: Number(row.points) || 0, dailyCap: Number(row.dailyCap) || 0, workflow: row.workflow, isCore: Boolean(row.isCore), status: row.status };
}
function code(label) { return text(label).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40); }
function validate(body) {
	const result = { label: text(body.label), description: text(body.description), actionClass: text(body.actionClass || 'C'), pillar: text(body.pillar), points: Math.max(1, Math.min(999, Number(body.points) || 1)), dailyCap: Math.max(1, Math.min(100, Number(body.dailyCap) || 1)), status: body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' };
	if (result.label.length < 3 || result.description.length < 10 || result.pillar.length < 3) throw new ApiError(400, 'Nama, deskripsi, dan pilar aksi belum lengkap.');
	if (!['B', 'C', 'D'].includes(result.actionClass)) throw new ApiError(400, 'Aksi berbukti harus memakai kelas B, C, atau D.');
	return result;
}
async function audit(pb, action, principal, operation, before, after) {
	return pb.collection('point_action_audits').create({ action: action.id, actionCode: action.code, operation, actor: principal.record.id, actorName: principal.record.displayName, actorRole: principal.role, before, after, occurredAt: new Date().toISOString() });
}

apiRoute('GET', '/point-actions', async (ctx) => {
	const principal = await ctx.principal();
	const pb = await ctx.admin();
	const filter = ['ADMIN', 'VERIFIER'].includes(principal.role) ? '' : 'status = "ACTIVE"';
	const rows = await pb.collection('point_actions').getFullList({ ...(filter ? { filter } : {}), sort: 'actionClass,label' });
	return { actions: rows.map(dto) };
});

apiRoute('POST', '/staff/point-actions', async (ctx) => {
	const principal = await ctx.principal({ roles: ['ADMIN', 'VERIFIER'] });
	const pb = await ctx.admin();
	const values = validate(await ctx.body());
	const now = new Date().toISOString();
	const row = await pb.collection('point_actions').create({ ...values, code: code(values.label), workflow: 'EVIDENCE', isCore: false, createdBy: principal.record.id, updatedBy: principal.record.id, createdAt: now, updatedAt: now });
	await audit(pb, row, principal, 'CREATE', null, dto(row));
	return { status: 201, body: dto(row) };
});

apiRoute('PATCH', '/staff/point-actions/{id}', async (ctx) => {
	const principal = await ctx.principal({ roles: ['ADMIN', 'VERIFIER'] });
	const pb = await ctx.admin();
	const current = await pb.collection('point_actions').getOne(ctx.params.id);
	const before = dto(current);
	const values = validate({ ...before, ...(await ctx.body()) });
	const row = await pb.collection('point_actions').update(current.id, { ...values, updatedBy: principal.record.id, updatedAt: new Date().toISOString() });
	await audit(pb, row, principal, 'UPDATE', before, dto(row));
	return dto(row);
});

apiRoute('DELETE', '/staff/point-actions/{id}', async (ctx) => {
	const principal = await ctx.principal({ roles: ['ADMIN', 'VERIFIER'] });
	const pb = await ctx.admin();
	const row = await pb.collection('point_actions').getOne(ctx.params.id);
	const before = dto(row);
	const [ledger, submissions] = await Promise.all([
		pb.collection('verified_point_activities').getList(1, 1, { filter: pb.filter('pointAction = {:id}', { id: row.id }), fields: 'id' }).catch(() => ({ totalItems: 0 })),
		pb.collection('activity_submissions').getList(1, 1, { filter: pb.filter('pointAction = {:id}', { id: row.id }), fields: 'id' }).catch(() => ({ totalItems: 0 }))
	]);
	if (row.isCore || ledger.totalItems || submissions.totalItems) {
		const updated = await pb.collection('point_actions').update(row.id, { status: 'INACTIVE', updatedBy: principal.record.id, updatedAt: new Date().toISOString() });
		await audit(pb, updated, principal, 'ARCHIVE', before, dto(updated));
		return { archived: true };
	}
	await audit(pb, row, principal, 'DELETE', before, null);
	await pb.collection('point_actions').delete(row.id);
	return { archived: false };
});

apiRoute('GET', '/staff/point-actions/{id}/audit', async (ctx) => {
	await ctx.principal({ roles: ['ADMIN', 'VERIFIER'] });
	const pb = await ctx.admin();
	const action = await pb.collection('point_actions').getOne(ctx.params.id);
	const rows = await pb.collection('point_action_audits').getFullList({ filter: pb.filter('actionCode = {:code}', { code: action.code }), sort: '-occurredAt' });
	return { audits: rows.map((row) => ({ id: row.id, operation: row.operation, actorName: row.actorName, actorRole: row.actorRole, before: row.before, after: row.after, occurredAt: row.occurredAt })) };
});
