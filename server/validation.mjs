import { z } from 'zod';
export const categories = ['Gardens & growing','Food & sharing','Nature & restoration','Learning & making','Community care'];
export const cities = ['Oakland','Berkeley','Alameda','Emeryville','Richmond','El Cerrito','Albany','San Leandro','Hayward','Other East Bay'];
const text = (min,max) => z.string().trim().min(min).max(max);
const website = z.union([z.literal(''), z.url().max(500).refine(s=>/^https?:\/\//.test(s),'Use an http or https website address.')]);
export const eventSchema = z.object({
 title:text(5,110), organization:text(2,100), website:website.default(''), category:z.enum(categories),
 description:text(30,3000), location_name:text(2,120), address:text(5,200), city:z.enum(cities),
 latitude:z.number().min(37.3).max(38.3),longitude:z.number().min(-122.7).max(-121.4),
 starts_at:z.iso.datetime({offset:true}),ends_at:z.iso.datetime({offset:true}),
 accessibility:text(0,1000).default(''),bring:text(0,1000).default(''),
 contact_name:text(2,100),contact_email:z.email().max(254).transform(s=>s.toLowerCase()),
 consent:z.literal(true),website_trap:z.string().max(0).optional()
}).refine(e=>new Date(e.ends_at)>new Date(e.starts_at),{message:'End time must be after the start time.',path:['ends_at']})
.refine(e=>new Date(e.starts_at)>new Date(),{message:'Choose a future event date.',path:['starts_at']})
.refine(e=>new Date(e.ends_at)-new Date(e.starts_at)<=7*86400000,{message:'Events must be shorter than one week.',path:['ends_at']});
export const registrationSchema=z.object({event_id:z.uuid(),name:text(2,100),email:z.email().max(254).transform(s=>s.toLowerCase()),consent:z.literal(true),website_trap:z.string().max(0).optional()});
export const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
export const uuidSchema=z.uuid();
export function publicEvent(row){
 const keys=['id','title','organization','website','category','description','location_name','address','city','latitude','longitude','starts_at','ends_at','timezone','accessibility','bring','status','is_demo','updated_at'];
 return Object.fromEntries(keys.map(k=>[k,row[k]]));
}
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
