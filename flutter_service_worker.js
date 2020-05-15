'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/AssetManifest.json": "ae8d3262c736f871539e303ebb74ca78",
"assets/assets/1.jpg": "f7ad5881b524ec568134a8846e0d04e2",
"assets/assets/10.jpg": "ce3e0f1f11d09188952061118c8845b9",
"assets/assets/2.jpg": "a24d8da58e5835e8bb2a0806803cbae1",
"assets/assets/3.jpg": "31f620a7b8838dfd94c634aaa2d10b96",
"assets/assets/4.jpg": "05028eaf116bf3324e0936ef5b5481ab",
"assets/assets/5.jpg": "95a8b99c8652ba6587e3bd94d085473b",
"assets/assets/6.jpg": "64c00982cbe1edd24d0d412aff541d83",
"assets/assets/7.jpg": "be9c96e178a25e4ef70fecd8145e69d5",
"assets/assets/8.jpg": "e5512dcdda50dd6d6f2f333f5bdf80a4",
"assets/assets/9.jpg": "89b98a7214334e01009ed3a9ca73ac9b",
"assets/assets/haptic-feedback-icon.flr": "9af496e4974aeab2ae8d8124f660b10a",
"assets/assets/lock-icon.flr": "7ad981f65fd3cb8eb23e1797cdadac1f",
"assets/FontManifest.json": "c55899ffa5c3ae83448d6b635308a562",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/LICENSE": "a947ac685cb11a07a50ce9c0e2b2adca",
"assets/packages/font_awesome_flutter/lib/fonts/fa-brands-400.ttf": "77ace0fee45b138f023459bf3af34ba0",
"assets/packages/font_awesome_flutter/lib/fonts/fa-duotone-900.ttf": "cf3b376d9576e4a9b0ba7ee4cdb3ec47",
"assets/packages/font_awesome_flutter/lib/fonts/fa-light-300.ttf": "5bdaa8582fd409b4a3fd9f03916de415",
"assets/packages/font_awesome_flutter/lib/fonts/fa-regular-400.ttf": "6ee0bdf1a4b4aad88663dfb01ef6f789",
"assets/packages/font_awesome_flutter/lib/fonts/fa-solid-900.ttf": "977e6fae30d6f3f1aed9997f1928f70d",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"index.html": "e2228327f871cf06b2c31d93dd823046",
"/": "e2228327f871cf06b2c31d93dd823046",
"main.dart.js": "b4893762fe646438af65912ee75aec2e",
"manifest.json": "45b6756ae08c1dcb20b1f98699dbd5a2"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
"/",
"index.html",
"assets/LICENSE",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(CORE);
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // If the URL is not the the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

