// https://developers.google.com/web/fundamentals/getting-started/primers/service-workers

//------------------------------
// Pre Cache and Update
//------------------------------

const CACHE = 'starwars-api-site-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/offline.html',
  '/0.chunk.js',
  '/1.chunk.js',
  '/styles.bundle.js',
  '/inline.bundle.js',
  '/polyfills.bundle.js',
  '/vendor.bundle.js',
  '/main.bundle.js'
];

self.addEventListener('install', event => {
  // We can kick the old version ou,
  // but then we're controlling a page loaded
  // with an older version of a service worker.
  // But instead, use Update on Reload for development
  // self.skipWaiting();

  // Ask the service worker to keep installing
  // until the returning promise resolves.
  event.waitUntil(preCache());
});

// Open a cache and use addAll() with an array of assets
// to add all of them to the cache.
// Return a promise resolving when all the assets are added.
function preCache() {
  return caches.open(CACHE).then(cache => {
    console.log('Opening cache and adding the following URLs to it', URLS_TO_CACHE);
    return cache.addAll(URLS_TO_CACHE);
  });
}

// On fetch, use cache but update the entry
// with the latest contents from the server.
self.addEventListener('fetch', event => {
  // In "lie-fi" environments, with awfully slow wifi,
  // the user will see the app shell while we load.
  // TODO: Ideally this should be the same shell our app uses.
  // const url = new URL(event.request.url);
  // if (url.origin === location.origin && url.pathname === '/') {
  //   event.respondWith(caches.match('/shell.html'));
  //   return;
  // }

  // Use respondWith() to answer immediately,
  // without waiting for the network response
  // to reach the service worker…
  event.respondWith(fromCache(event.request));

  // Use `waitUntil()` to prevent the worker to be killed
  // until the cache is updated.
  event.waitUntil(update(event.request));
});

// Open the cache where the assets were stored and search for the requested resource.
// Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
  swLog('searching the cache for ' + request.url);
  return caches.open(CACHE).then(cache => {
    console.log('trying to match', request);
    return cache.match(request).then(matching => {
      // The match() method of the Cache interface returns a Promise
      // that resolves to the Response associated with the
      // first matching request in the Cache object.
      // If no match is found, the Promise resolves to undefined.
      if (matching) {
        swLog('found a match', matching);
        return matching; // || Promise.reject('no-match');
      } else {
        swLog('match not found. request mode ===  ' + request.mode + ', fetching ...', request);
        return fetch(request).then(response => {
          swLog('updating the cache with ' + request.url);
          const responseClone = response.clone();
          cache.put(request, responseClone);
          return response;
        }).catch(error => {
          swLog('error while fetching', error);
          if (request.mode === 'navigate') {
            swLog('return offline html');
            return caches.match('/offline.html');
          }
          swLog('no match found and not navigating, so we return undefined');
        })
      }
    })
  });
}

// Update opens the cache,
// performs a network request
// and stores the new response data.
function update(request) {
  return caches.open(CACHE).then(cache => {
    return fetch(request).then(response => {
      swLog('updating the cache with ' + request.url);
      return cache.put(request, response);
    });
  });
}

self.addEventListener('activate', event => {
  swLog('activate event fired', event);
  // Let's say we have one cache called 'my-site-cache-v1',
  // and we find that we want to split this out into one cache for
  // pages and one cache for blog posts.This means in the install
  // step we'd create two caches, 'starwars-api-site-cache-v1' and 'some-other-posts-cache - v1'
  // and in the activate step we'd want to delete our older 'my-site-cache-v1'.
  //
  // The following code would do this by looping through all of the
  // caches in the service worker and deleting any caches that
  // aren't defined in the cache whitelist.
  var expectedCaches = [CACHE, 'some-other-cache-v1'];

  // we use waitUntil() to prevent the worker
  // to be killed until the cache is updated.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => {
        if (!expectedCaches.includes(cacheName)) {
          swLog('deleting cache: ' + cacheName);
          return caches.delete(cacheName);
        }
      }));
    })
  );
});

function swLog(eventName, event) {
  console.log('Service Worker - ' + eventName);
  if (event) {
    console.log(event);
  }
}

self.addEventListener('sync', event => {
  console.log('I heard a sync event!');
  if (event.tag === 'mySync') {
    event.waitUntil(
      getMessagesFromOutbox()
        .then(messages => sendMessagesToServer(messages))
        .then(messages => removeMessagesFromOutBox(messages))
      );
  }
});

function getMessagesFromOutbox() {
  const messages = [
    'message 1',
    'message 2',
    'message 3'
  ];
  console.log('messages retrieved from outbox', messages);
  return Promise.resolve(messages);
}

function sendMessagesToServer(messages) {
  console.log('messages sent!', messages);
  return Promise.resolve(messages);
}

function removeMessagesFromOutBox(messages) {
  console.log('messages removed!', messages);
  return Promise.resolve(messages);
}


