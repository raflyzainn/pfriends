import { getPocketBase, pocketBaseMessage } from './client.js';
function client() { const pb=getPocketBase(); if(!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.'); return pb; }
export async function staffPointActions(){try{return await client().send('/api/pfriends/point-actions')}catch(error){throw new Error(pocketBaseMessage(error,'Katalog aksi gagal dimuat.'))}}
export async function savePointAction(values,id=''){try{return await client().send(id?`/api/pfriends/staff/point-actions/${id}`:'/api/pfriends/staff/point-actions',{method:id?'PATCH':'POST',body:values})}catch(error){throw new Error(pocketBaseMessage(error,'Aksi gagal disimpan.'))}}
export async function deletePointAction(id){try{return await client().send(`/api/pfriends/staff/point-actions/${id}`,{method:'DELETE'})}catch(error){throw new Error(pocketBaseMessage(error,'Aksi gagal dihapus.'))}}
export async function pointActionAudit(id){try{return await client().send(`/api/pfriends/staff/point-actions/${id}/audit`)}catch(error){throw new Error(pocketBaseMessage(error,'Audit aksi gagal dimuat.'))}}
