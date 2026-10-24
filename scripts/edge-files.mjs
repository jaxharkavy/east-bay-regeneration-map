import fs from 'node:fs';
const files=['server/api.mjs','server/calendar.mjs','server/validation.mjs','server/demo.mjs'].map(name=>({name,content:fs.readFileSync(name,'utf8')}));
const site=process.argv[2]||'http://localhost:5173';
files.push({name:'index.ts',content:`import {makeApi} from './server/api.mjs';\nconst env=Deno.env.toObject();\nconst keys=JSON.parse(env.SUPABASE_SECRET_KEYS||'{}');\nDeno.serve(makeApi({...env,SUPABASE_SECRET_KEY:keys.default||env.SUPABASE_SERVICE_ROLE_KEY,SITE_URL:${JSON.stringify(site)}}));\n`});
files.push({name:'deno.json',content:JSON.stringify({imports:{'@supabase/supabase-js':'npm:@supabase/supabase-js@2.118.0',zod:'npm:zod@4.6.7'}})});
console.log(JSON.stringify(files));
