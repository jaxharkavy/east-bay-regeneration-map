const esc=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line){let result='',part='',size=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(size+n>73){result+=part+'\r\n ';part='';size=1;}part+=char;size+=n;}return result+part;}
export function calendar(event,siteUrl){
 const description=`${event.is_demo?'DEMO EVENT — not a real opportunity.\n\n':''}${event.description}\n\nWhat to bring: ${event.bring||'Check with the organizer.'}\nAccessibility: ${event.accessibility||'Ask the organizer.'}\n\nCheck the event page for updates. Downloaded calendar entries do not update automatically.\n${siteUrl}/events/${event.id}`;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//East Bay Regeneration Map//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${event.id}@eastbayregeneration`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(event.starts_at)}`,`DTEND:${stamp(event.ends_at)}`,`SUMMARY:${esc(event.title)}`,`DESCRIPTION:${esc(description)}`,`LOCATION:${esc(`${event.location_name}, ${event.address}, ${event.city}`)}`,`URL:${siteUrl}/events/${event.id}`,`STATUS:${event.status==='cancelled'?'CANCELLED':'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
