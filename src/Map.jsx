import {useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
const colors={'Gardens & growing':'#43664b','Food & sharing':'#bb724f','Nature & restoration':'#5c7e87','Learning & making':'#9b8745','Community care':'#93718c'};
export default function Map({events=[],selected,onSelect,picking=false,point,onPick}){
 const node=useRef(null),map=useRef(null),markers=useRef([]),callbacks=useRef({onSelect,onPick});callbacks.current={onSelect,onPick};
 useEffect(()=>{
  map.current=L.map(node.current,{scrollWheelZoom:false,zoomControl:false}).setView([37.845,-122.28],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map.current);
  L.control.zoom({position:'topright'}).addTo(map.current);
  if(picking)map.current.on('click',e=>callbacks.current.onPick?.({latitude:Number(e.latlng.lat.toFixed(6)),longitude:Number(e.latlng.lng.toFixed(6))}));
  const observer=new ResizeObserver(()=>map.current?.invalidateSize());observer.observe(node.current);
  return()=>{observer.disconnect();map.current?.remove();map.current=null;};
 },[picking]);
 useEffect(()=>{
  if(!map.current)return;markers.current.forEach(m=>m.remove());markers.current=[];
  const items=picking?(point?[{id:'pick',...point}]:[]):events;
  items.forEach((event,i)=>{
   const active=event.id===selected;
   const marker=L.marker([event.latitude,event.longitude],{icon:L.divIcon({className:'map-marker-shell',html:`<span class="map-marker ${active?'active':''}" style="--pin:${colors[event.category]||'#234b38'}">${picking?'+':i+1}</span>`,iconSize:[36,44],iconAnchor:[18,40]}),title:event.title||'Selected event location',keyboard:true}).addTo(map.current);
   if(!picking)marker.on('click',()=>callbacks.current.onSelect?.(event.id));
   markers.current.push(marker);
  });
  if(items.length&&!picking)map.current.fitBounds(items.map(e=>[e.latitude,e.longitude]),{padding:[70,70],maxZoom:13});
 },[events,picking,point]);
 useEffect(()=>{markers.current.forEach((m,i)=>{const el=m.getElement()?.querySelector('.map-marker');el?.classList.toggle('active',events[i]?.id===selected);});},[selected,events]);
 return <div className={`map-canvas ${picking?'picking':''}`} ref={node} role="region" aria-label={picking?'Click the map to choose your event location':'Map of East Bay volunteer events'}/>;
}
