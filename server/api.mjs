import {createClient} from '@supabase/supabase-js';
import {eventSchema, registrationSchema, tokenSchema, uuidSchema, publicEvent, escapeHtml} from './validation.mjs';
import {calendar} from './calendar.mjs';
import {demoEvents} from './demo.mjs';
const encoder=new TextEncoder();
export const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
function result(r){if(r.error)throw r.error;return r.data;}
const authOptions={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
export function makeApi(env={}){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 const siteUrl=(env.SITE_URL||'http://localhost:5173').replace(/\/$/,'');
 const db=url&&key?createClient(url,key,authOptions):null;
 const secure=siteUrl.startsWith('https:');
 const cookieName=secure?'__Host-guild_session':'guild_session';
 const sessionCookie=(token,age=3600)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 async function rate(req,scope,limit=15,seconds=900){
  const ip=req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const bucket=Math.floor(Date.now()/(seconds*1000));
  const secret=env.RATE_LIMIT_SECRET||key;
  const digest=await hash(`${secret}:${scope}:${ip}:${bucket}`);
  if(!result(await db.rpc('consume_rate_limit',{p_key:digest,p_limit:limit,p_seconds:seconds})))throw new HttpError(429,'Too many attempts. Please try again later.');
  const globalKey=await hash(`${secret}:global:${scope}:${bucket}`);
  if(!result(await db.rpc('consume_rate_limit',{p_key:globalKey,p_limit:Math.max(limit*30,200),p_seconds:seconds})))throw new HttpError(429,'The site is busy. Please try again later.');
 }
 async function admin(req){
  const raw=req.headers.get('cookie')||'';
  const token=raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token)throw new HttpError(401,'Please sign in to the Guild dashboard.');
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw new HttpError(401,'Your session has expired. Please sign in again.');
  const row=result(await db.from('guild_admins').select('user_id').eq('user_id',data.user.id).maybeSingle());
  if(!row)throw new HttpError(403,'This account does not have Guild access.');
  return data.user;
 }
 async function getEvent(id,privateAccess=false){
  uuidSchema.parse(id);
  let query=db.from('event_details').select('*').eq('id',id);
  if(!privateAccess)query=query.in('status',['published','cancelled']);
  const row=result(await query.maybeSingle());
  if(!row)throw new HttpError(404,'This event is not available.');
  return publicEvent(row);
 }
 return async function handle(req){
  try{
   let path=new URL(req.url).pathname.replace(/^\/(?:functions\/v1\/)?regeneration-api/,'/api').replace(/\/$/,'');
   if(!path.startsWith('/api'))path='/api'+path;
   const method=req.method;
   const mutating=!['GET','HEAD'].includes(method);
   if(method==='OPTIONS')return new Response(null,{status:405});
   if(mutating){
    if(req.headers.get('origin')!==siteUrl)throw new HttpError(403,'Please submit this form from the website.');
    if(!req.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Expected a JSON form.');
    if(Number(req.headers.get('content-length')||0)>20000)throw new HttpError(413,'This form is too large.');
   }
   const body=async()=>{const raw=await req.text();if(raw.length>20000)throw new HttpError(413,'This form is too large.');try{return JSON.parse(raw);}catch{throw new HttpError(400,'The form could not be read.');}};
   if(path==='/api/health')return json({connected:!!db,email_enabled:false});
   if(!db){
    if(path==='/api/events'&&method==='GET')return json({events:demoEvents,connected:false});
    const demoMatch=path.match(/^\/api\/events\/([^/]+)(\/calendar)?$/);
    if(demoMatch&&method==='GET'){
     const event=demoEvents.find(e=>e.id===demoMatch[1]);if(!event)throw new HttpError(404,'Event not found.');
     return demoMatch[2]?new Response(calendar(event,siteUrl),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="event.ics"'}}):json({event,connected:false});
    }
    throw new HttpError(503,'The live database is not connected yet. No information has been saved.');
   }
   if(path==='/api/events'&&method==='GET'){
    const rows=result(await db.from('event_details').select('*').eq('status','published').gt('ends_at',new Date().toISOString()).order('starts_at').limit(250));
    return json({events:rows.map(publicEvent),connected:true});
   }
   const eventMatch=path.match(/^\/api\/events\/([^/]+)(\/calendar)?$/);
   if(eventMatch&&method==='GET'){
    const event=await getEvent(eventMatch[1]);
    return eventMatch[2]?new Response(calendar(event,siteUrl),{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store','Content-Disposition':'attachment; filename="east-bay-event.ics"'}}):json({event,connected:true});
   }
   if(path==='/api/support'&&method==='POST'){
    await rate(req,'support',5,3600);const {email,message,website_trap}=await body();if(website_trap||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof message!=='string'||message.trim().length<10||message.length>2000)throw new HttpError(400,'Enter a valid email and a message of 10–2000 characters.');
    result(await db.from('support_requests').insert({email:email.trim().toLowerCase(),message:message.trim()}));return json({ok:true},201);
   }
   if(path==='/api/submissions'&&method==='POST'){
    await rate(req,'submit',5,3600);const payload=eventSchema.parse(await body());
    const id=result(await db.rpc('submit_event',{payload}));return json({id,status:'pending'},201);
   }
   if(path==='/api/registrations'&&method==='POST'){
    await rate(req,'register',12);const data=registrationSchema.parse(await body());const token=randomToken();
    const r=await db.rpc('register_for_event',{p_event:data.event_id,p_name:data.name,p_email:data.email,p_token_hash:await hash(token)});
    if(r.error?.message?.includes('ALREADY_REGISTERED'))throw new HttpError(409,'This email is already registered. Use your saved cancellation link to manage your place. If you lost it, contact the Guild.');
    if(r.error?.message?.includes('EVENT_UNAVAILABLE'))throw new HttpError(409,'This event is no longer accepting registrations.');
    const id=result(r);return json({id,cancel_token:token,event:await getEvent(data.event_id),email_enabled:false},201);
   }
   if(path==='/api/registration'&&method==='POST'){
    await rate(req,'manage',25);const {token,action}=await body();tokenSchema.parse(token);
    if(!['view','cancel'].includes(action))throw new HttpError(400,'Invalid action.');
    const digest=await hash(token);let row=result(await db.from('registrations').select('id,event_id,status').eq('token_hash',digest).maybeSingle());
    if(!row)throw new HttpError(404,'This cancellation link is invalid.');
    if(action==='cancel'&&row.status!=='cancelled')row=result(await db.from('registrations').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',row.id).select('id,event_id,status').single());
    return json({status:row.status,event:await getEvent(row.event_id,true)});
   }
   if(path==='/api/admin/setup'&&method==='POST'){
    await rate(req,'setup',5,3600);const {token,email,password}=await body();tokenSchema.parse(token);
    if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof password!=='string'||password.length<14||password.length>128)throw new HttpError(400,'Use a valid email and a password of 14–128 characters.');
    const digest=await hash(token);
    const setup=result(await db.from('guild_setup').select('token_hash').eq('token_hash',digest).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle());
    if(!setup)throw new HttpError(403,'This setup link has expired or has already been used.');
    const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
    if(error)throw new HttpError(400,'Could not create this account. Try another email or ask the site owner for help.');
    const claimed=result(await db.rpc('claim_guild_setup',{p_hash:digest,p_user:data.user.id}));
    if(!claimed)throw new HttpError(409,'This setup link was already used. Ask the owner to grant this account Guild access.');
    return json({ok:true});
   }
   if(path==='/api/admin/login'&&method==='POST'){
    await rate(req,'login',10);const {email,password}=await body();
    if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>128)throw new HttpError(400,'Enter your email and password.');
    const auth=createClient(url,key,authOptions);const {data,error}=await auth.auth.signInWithPassword({email,password});
    if(error||!data.user)throw new HttpError(401,'Email or password is incorrect.');
    const isAdmin=result(await db.from('guild_admins').select('user_id').eq('user_id',data.user.id).maybeSingle());
    if(!isAdmin)throw new HttpError(403,'This account does not have Guild access.');
    return json({ok:true},200,{'Set-Cookie':sessionCookie(data.session.access_token,data.session.expires_in)});
   }
   if(path==='/api/admin/logout'&&method==='POST')return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});
   if(path.startsWith('/api/admin')){
    const user=await admin(req);
    if(path==='/api/admin/support'&&method==='GET')return json({requests:result(await db.from('support_requests').select('*').eq('status','open').order('created_at'))});
    if(path==='/api/admin/support'&&method==='PATCH'){const {id}=await body();uuidSchema.parse(id);result(await db.from('support_requests').update({status:'resolved'}).eq('id',id));return json({ok:true});}
    if(path==='/api/admin/events'&&method==='GET'){
     const events=result(await db.from('event_details').select('*').order('created_at',{ascending:false}).limit(500));
     const contacts=result(await db.from('event_contacts').select('*'));const registrations=result(await db.from('registrations').select('event_id,status'));
     return json({email:user.email,events:events.map(e=>({...publicEvent(e),contact:contacts.find(c=>c.event_id===e.id),registrations:registrations.filter(r=>r.event_id===e.id&&r.status==='registered').length}))});
    }
    const match=path.match(/^\/api\/admin\/events\/([^/]+)(\/registrations)?$/);
    if(match){
     uuidSchema.parse(match[1]);
     if(match[2]&&method==='GET')return json({registrations:result(await db.from('registrations').select('id,name,email,status,created_at').eq('event_id',match[1]).order('created_at'))});
     if(!match[2]&&method==='PATCH'){
      const data=await body();const patch={updated_at:new Date().toISOString()};
      if(data.status){if(!['published','hidden','cancelled','pending'].includes(data.status))throw new HttpError(400,'Invalid status.');patch.status=data.status;patch.reviewed_at=new Date().toISOString();}
      for(const field of ['title','description','accessibility','bring'])if(data[field]!==undefined){if(typeof data[field]!=='string'||data[field].length>3000)throw new HttpError(400,'Invalid event details.');patch[field]=data[field].trim();}
      const event=result(await db.from('events').update(patch).eq('id',match[1]).select('id').maybeSingle());if(!event)throw new HttpError(404,'Event not found.');return json({ok:true});
     }
     if(match[2]&&method==='PATCH'){
      const {registration_id}=await body();uuidSchema.parse(registration_id);
      const row=result(await db.from('registrations').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',registration_id).eq('event_id',match[1]).select('id').maybeSingle());
      if(!row)throw new HttpError(404,'Registration not found.');return json({ok:true});
     }
    }
   }
   throw new HttpError(404,'Page not found.');
  }catch(error){
   if(error?.name==='ZodError')return json({error:error.issues.map(i=>i.message).join(' ')},400);
   if(error instanceof HttpError)return json({error:error.message},error.status);
   console.error('API failure',error?.code||error?.name||'unknown');
   return json({error:'Something went wrong. Please try again. If it continues, contact the Guild.'},500);
  }
 };
}
export function eventHtml(event,siteUrl){
 const e=escapeHtml;const title=`${event.title} — East Bay Regeneration Map`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(event.description.slice(0,160))}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(event.description.slice(0,160))}"><link rel="canonical" href="${e(siteUrl)}/events/${event.id}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"><main class="page"><a href="/">East Bay Regeneration Map</a><h1>${e(event.title)}</h1>${event.is_demo?'<p>Demo event — not a real opportunity.</p>':''}<p>${e(event.organization)}</p><p>${e(event.description)}</p><p>${e(event.starts_at)} · ${e(event.location_name)}, ${e(event.city)}</p></main></div><script type="module" src="/assets/app.js"></script></body></html>`;
}
