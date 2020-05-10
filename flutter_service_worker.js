'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/AssetManifest.json": "703c6edb2ac835233ff733e0377ee0a1",
"assets/assets/1.jpg": "44f6fb166bf56a2434022e0346943159",
"assets/assets/10.jpg": "6399e56c55476f951cba8195b0904043",
"assets/assets/2.jpg": "5b747d4e6d874a12f10fe001e2287aa3",
"assets/assets/3.jpg": "4760d0b2f9c2861ef7366b6000d12577",
"assets/assets/4.jpg": "230a2f9345acfbc97dd2a3dec6c18e1e",
"assets/assets/5.jpg": "f500125cd6bd137a8971146d8d03273d",
"assets/assets/6.jpg": "c2f1de754eb5d81873f6901f0afcd776",
"assets/assets/7.jpg": "77f4ebda0f00fd6a154af8ab3e2126e5",
"assets/assets/8.jpg": "6dcfcaa56aa3ce94219ebc2c7948c6f9",
"assets/assets/9.jpg": "2fb3a5e17dcb0d23bb057d31057ca645",
"assets/FontManifest.json": "b6d132196e58ddfc0087dad67d965e28",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/fonts/ModernPictograms.ttf": "ac6c20f4f0a853021a5fab930f1ad668",
"assets/LICENSE": "44545ded24d0803602941b1981ed1603",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"assets/packages/font_awesome_flutter/lib/fonts/fa-brands-400.ttf": "77ace0fee45b138f023459bf3af34ba0",
"assets/packages/font_awesome_flutter/lib/fonts/fa-duotone-900.ttf": "cf3b376d9576e4a9b0ba7ee4cdb3ec47",
"assets/packages/font_awesome_flutter/lib/fonts/fa-light-300.ttf": "5bdaa8582fd409b4a3fd9f03916de415",
"assets/packages/font_awesome_flutter/lib/fonts/fa-regular-400.ttf": "6ee0bdf1a4b4aad88663dfb01ef6f789",
"assets/packages/font_awesome_flutter/lib/fonts/fa-solid-900.ttf": "977e6fae30d6f3f1aed9997f1928f70d",
"assets/packages/outline_material_icons/lib/outline_material_icons.ttf": "6b94994fffd9868330d830fcb18a6026",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"index.html": "e2228327f871cf06b2c31d93dd823046",
"/": "e2228327f871cf06b2c31d93dd823046",
"main.dart.js": "bccb7e74f18a42c7bab035320c5d6f44",
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

