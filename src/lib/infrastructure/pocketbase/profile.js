import { getPocketBase, pocketBaseMessage } from './client.js';

function client() { const pb=getPocketBase();if(!pb?.authStore.isValid)throw new Error('Sesi PocketBase tidak tersedia.');return pb; }
async function send(path,options={}){try{return await client().send(path,options);}catch(error){throw new Error(pocketBaseMessage(error,'Profil gagal diproses.'));}}
async function withUrls(response){const pb=client(),token=await pb.files.getToken();const avatarUrl=response.profile?.avatar?pb.files.getURL({id:response.profile.recordId||response.profile.id,collectionName:'awardees'},response.profile.avatar,{token}):response.profile?.avatarPath?`${pb.baseURL}${response.profile.avatarPath}?token=${encodeURIComponent(token)}`:'';return{...response,profile:{...response.profile,avatarUrl},products:(response.products||[]).map(product=>({...product,imageUrl:product.image?pb.files.getURL({id:product.id,collectionName:'business_products'},product.image,{token}):''}))};}
export async function myProfile(){return withUrls(await send('/api/pfriends/profile/me'));}
export async function updateProfile(data){return withUrls(await send('/api/pfriends/profile/me',{method:'PATCH',body:data}));}
export async function grantConsent(type){return send(`/api/pfriends/profile/consents/${encodeURIComponent(type)}/grant`,{method:'POST'});}
export async function revokeConsent(type){return send(`/api/pfriends/profile/consents/${encodeURIComponent(type)}/revoke`,{method:'POST'});}
export async function createProduct(data){return send('/api/pfriends/profile/products',{method:'POST',body:data});}
export async function updateProduct(id,data){return send(`/api/pfriends/profile/products/${id}`,{method:'PATCH',body:data});}
export async function deleteProduct(id){return send(`/api/pfriends/profile/products/${id}`,{method:'DELETE'});}
