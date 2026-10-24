import {demoEvents} from '../server/demo.mjs';
const quote=s=>"'"+s.replaceAll("'","''")+"'";
let sql='';
for(const e of demoEvents){const payload={...e,contact_name:'Demo maintainer',contact_email:'demo@example.com'};sql+=`do $$ declare eid uuid; begin select public.submit_event(${quote(JSON.stringify(payload))}::jsonb) into eid; update public.events set is_demo=true,status='published',reviewed_at=now() where id=eid; end $$;\n`;}
console.log(sql);
