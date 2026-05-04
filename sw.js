const CACHE='paydayguard-v3';
const SHELL=['./','/paydayguard/','/paydayguard/index.html','/paydayguard/manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  // Only handle GET requests — never intercept POST (Firebase, Teller, etc.)
  if(e.request.method!=='GET')return;

  var url=new URL(e.request.url);

  // Let Firebase and Teller handle their own requests
  if(url.hostname.includes('googleapis.com')||
     url.hostname.includes('firebase')||
     url.hostname.includes('teller.io')||
     url.hostname.includes('cloudfunctions.net')||
     url.hostname.includes('gstatic.com')){
    return;
  }

  // App shell: cache-first, fall back to network, fall back to root
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(res=>{
        if(res.ok){
          var clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>caches.match('./'));
    })
  );
});
