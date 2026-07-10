const CACHE='paydayguard-v5';
const SHELL=['/paydayguard/','/paydayguard/index.html','/paydayguard/manifest.json'];

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

// ==== Push notifications ====
// Receives a push message from the Cloud Function and draws the notification,
// even when the app isn't open.
self.addEventListener('push',e=>{
  let data={};
  try{data=e.data?e.data.json():{};}catch(_){data={body:e.data&&e.data.text()};}
  const title=data.title||'PaydayGuard';
  const options={
    body:data.body||'Open PaydayGuard',
    tag:'paydayguard-daily', // replaces yesterday's instead of stacking
    renotify:true
  };
  e.waitUntil(self.registration.showNotification(title,options));
});

// Tapping the notification focuses the app if open, else opens it.
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){if('focus'in c)return c.focus();}
      if(self.clients.openWindow)return self.clients.openWindow(target);
    })
  );
});
