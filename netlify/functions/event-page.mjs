import {eventHtml} from '../../server/api.mjs';
export default async function handler(request){
 const url=new URL(request.url);const id=url.pathname.split('/')[2];
 if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Event not found',{status:404});
 const response=await fetch(`https://uznbvkuxfhdriiqdotsr.supabase.co/functions/v1/regeneration-api/events/${id}`);
 if(!response.ok)return new Response('<!doctype html><html lang="en"><title>Event unavailable</title><h1>This event is not available.</h1><a href="/">Return to the map</a></html>',{status:response.status===404?404:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 const {event}=await response.json();return new Response(eventHtml(event,url.origin),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
export const config={path:'/events/:id'};
