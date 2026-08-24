import { myProfile,updateProfile,grantConsent,revokeConsent,createProduct,updateProduct,deleteProduct } from '$lib/infrastructure/pocketbase/profile.js';

class ProfileStore {
	data=$state.raw(null);loading=$state(false);working=$state(false);error=$state(null);
	async load(){this.loading=true;this.error=null;try{this.data=await myProfile();return this.data;}catch(error){this.error=error instanceof Error?error.message:'Profil gagal dimuat.';throw error;}finally{this.loading=false;}}
	async update(data){return this.#run(()=>updateProfile(data));}
	async grant(type){await this.#run(()=>grantConsent(type));return this.load();}
	async revoke(type){let result;await this.#run(async()=>{result=await revokeConsent(type);return result;});await this.load();return result;}
	async createProduct(data){await this.#run(()=>createProduct(data));return this.load();}
	async updateProduct(id,data){await this.#run(()=>updateProduct(id,data));return this.load();}
	async deleteProduct(id){await this.#run(()=>deleteProduct(id));return this.load();}
	async #run(action){this.working=true;this.error=null;try{const result=await action();if(result?.profile)this.data=result;return result;}catch(error){this.error=error instanceof Error?error.message:'Perubahan gagal disimpan.';throw error;}finally{this.working=false;}}
}
export const awardeeProfile=new ProfileStore();
