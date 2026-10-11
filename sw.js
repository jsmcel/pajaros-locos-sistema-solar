const CACHE='solar-jorge-1';
self.addEventListener('install',event=>event.waitUntil((async()=>{const response=await fetch('asset-list.json',{cache:'no-store'});if(!response.ok)throw new Error('Missing local asset list');const paths=await response.json();const cache=await caches.open(CACHE);await cache.addAll(paths.map(p=>'./'+p));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request.url);
    const range=event.request.headers.get('range');
    if(range&&cached){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match)return new Response(null,{status:416});
      const bytes=await cached.arrayBuffer(),size=bytes.byteLength;
      let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      let end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
      if(start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'application/octet-stream','Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes','Content-Length':String(end-start+1)}});
    }
    try{const response=await fetch(event.request);if(response.ok&&!range){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}
    catch{if(cached)return cached;if(event.request.mode==='navigate'){const index=await caches.match('./index.html');if(index)return index;}throw new Error('Not cached');}
  })());
});
