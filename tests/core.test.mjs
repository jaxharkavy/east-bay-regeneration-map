import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {eventSchema,publicEvent} from '../server/validation.mjs';
import {calendar} from '../server/calendar.mjs';
import {makeApi,eventHtml} from '../server/api.mjs';
import {demoEvents} from '../server/demo.mjs';
const event={...demoEvents[0],starts_at:new Date(Date.now()+86400000*3).toISOString(),ends_at:new Date(Date.now()+86400000*3+7200000).toISOString(),contact_name:'QA organizer',contact_email:'organizer@example.com',consent:true};
test('submission validation rejects past/reversed times, private-region coordinates, and unsafe website protocols',()=>{
 assert.equal(eventSchema.safeParse(event).success,true);
 for(const patch of [{ends_at:event.starts_at},{starts_at:'2020-01-01T10:00:00Z'},{latitude:0},{website:'javascript:alert(1)'},{consent:false},{website_trap:'spam'}])assert.equal(eventSchema.safeParse({...event,...patch}).success,false);
});
test('public event projection removes contacts, internal identifiers, and cancellation tokens',()=>{
 const result=publicEvent({...event,contact_email:'secret@example.com',token_hash:'private',organization_id:'internal'});
 for(const key of ['contact_email','token_hash','organization_id','contact_name'])assert.equal(key in result,false);
});
test('calendar uses UTC, escapes user text, and folds long UTF-8 lines',()=>{
 const value=calendar({...event,title:'Garden, care; 🌱\nATTENDEE:injection',description:'🌱'.repeat(150)},'https://example.com');
 assert.match(value,/BEGIN:VCALENDAR\r\nVERSION:2.0/);assert.match(value,/DTSTART:\d{8}T\d{6}Z/);assert.ok(value.includes('Garden\\, care\\;'));assert.ok(!value.includes('\r\nATTENDEE:'));
 for(const line of value.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('event HTML escapes untrusted titles and descriptions',()=>{const html=eventHtml({...event,title:'<script>alert(1)</script>',description:'"><img src=x onerror=alert(1)>'},'https://example.com');assert.ok(!html.includes('<script>alert'));assert.ok(html.includes('&lt;script&gt;'));});
test('disconnected preview never pretends to save registrations; cross-site writes fail',async()=>{
 const handle=makeApi({SITE_URL:'http://localhost:5173'});
 const read=await handle(new Request('http://localhost:5173/api/events'));assert.equal(read.status,200);assert.equal((await read.json()).connected,false);
 const bad=await handle(new Request('http://localhost:5173/api/registrations',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}));assert.equal(bad.status,403);
 const write=await handle(new Request('http://localhost:5173/api/registrations',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:'{}'}));assert.equal(write.status,503);
});
test('database approval, registration, cancellation and privacy rules',async()=>{
 const db=new PGlite();
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(await readFile(new URL('../supabase/migrations/20261024190122_initial_regeneration_map.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261024191437_support_requests.sql',import.meta.url),'utf8'));
 const {rows:[{id}]}=await db.query('select public.submit_event($1::jsonb) as id',[JSON.stringify(event)]);
 assert.equal((await db.query('select status from events where id=$1',[id])).rows[0].status,'pending');
 await assert.rejects(db.query("select public.register_for_event($1,'Test','test@example.com',$2)",[id,'a'.repeat(64)]),/EVENT_UNAVAILABLE/);
 await db.query("update events set status='published' where id=$1",[id]);
 await db.query("select public.register_for_event($1,'Test','test@example.com',$2)",[id,'a'.repeat(64)]);
 await assert.rejects(db.query("select public.register_for_event($1,'Another','TEST@example.com',$2)",[id,'b'.repeat(64)]),/ALREADY_REGISTERED/);
 await db.query("update registrations set status='cancelled' where event_id=$1",[id]);
 await db.query("select public.register_for_event($1,'Test','test@example.com',$2)",[id,'b'.repeat(64)]);
 await db.query("update events set status='cancelled' where id=$1",[id]);
 await assert.rejects(db.query("select public.register_for_event($1,'Late','late@example.com',$2)",[id,'c'.repeat(64)]),/EVENT_UNAVAILABLE/);
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from registrations'),/permission denied/);
 await assert.rejects(db.query('select * from event_contacts'),/permission denied/);
 await assert.rejects(db.query('select * from event_details'),/permission denied/);
 await assert.rejects(db.query('select public.submit_event($1::jsonb)',[JSON.stringify(event)]),/permission denied/);
 await db.exec('reset role;set role authenticated');
 await assert.rejects(db.query('select * from guild_admins'),/permission denied/);
 await assert.rejects(db.query("select public.claim_guild_setup($1,gen_random_uuid())",['a'.repeat(64)]),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query("select public.consume_rate_limit('qa',1,60) as ok")).rows[0].ok,true);
 assert.equal((await db.query("select public.consume_rate_limit('qa',1,60) as ok")).rows[0].ok,false);
 await db.close();
});
