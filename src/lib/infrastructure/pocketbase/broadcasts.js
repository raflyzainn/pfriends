import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';
function pb(){const client=getPocketBase();if(!client?.authStore.isValid)throw new Error('Sesi PocketBase tidak tersedia.');return client}
export async function listBroadcasts(){try{return (await apiRequest('/api/pfriends/broadcasts')).broadcasts||[]}catch(e){throw new Error(pocketBaseMessage(e,'Kabar gagal dimuat.'))}}
export async function startBroadcast(id){return apiRequest(`/api/pfriends/broadcasts/${id}/start`,{method:'POST'})}
export async function engageBroadcast(id,type,response='',requestKey=''){try{return await apiRequest(`/api/pfriends/broadcasts/${id}/engage`,{method:'POST',body:{type,response,requestKey}})}catch(e){throw new Error(pocketBaseMessage(e,'Aksi kabar gagal dicatat.'))}}
export async function adminBroadcasts(){return (await apiRequest('/api/pfriends/admin/broadcasts')).broadcasts||[]}
export async function verifierBroadcasts(){return (await apiRequest('/api/pfriends/verifier/broadcasts')).broadcasts||[]}
export async function saveBroadcast(values,id=''){return apiRequest(id?`/api/pfriends/admin/broadcasts/${id}`:'/api/pfriends/admin/broadcasts',{method:id?'PATCH':'POST',body:values})}
export async function publishBroadcast(id){return apiRequest(`/api/pfriends/admin/broadcasts/${id}/publish`,{method:'POST'})}
export async function deleteBroadcast(id){return apiRequest(`/api/pfriends/admin/broadcasts/${id}`,{method:'DELETE'})}
