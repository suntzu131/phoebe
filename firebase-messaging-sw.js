// Firebase Cloud Messaging Service Worker — Phoebe Dashboard
// Handles background push notifications when the app is not in focus.

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyDPBOJbb5U68DKaauYQzIypmVK9rqVxHO0",
    authDomain: "han-personal-project.firebaseapp.com",
    projectId: "han-personal-project",
    messagingSenderId: "938700169686",
    appId: "1:938700169686:web:8b0bc2aaceee613366c477",
    databaseURL: "https://han-personal-project-default-rtdb.firebaseio.com"
});

var messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage(function(payload) {
    var title = (payload.notification && payload.notification.title) || "Phoebe";
    var body = (payload.notification && payload.notification.body) || "";

    // If data payload is present, prefer it (sent by firebase-admin)
    if (payload.data) {
        title = payload.data.title || title;
        body = payload.data.body || body;
    }

    var options = {
        body: body,
        icon: "/phoebe/phoebe-profile.png",
        badge: "/phoebe/icon-192.png",
        tag: "phoebe-chat",           // Replace, don't stack
        renotify: true,                // Vibrate even when replacing
        data: {
            url: "/phoebe/",
            panel: "panel-chat"
        },
        actions: [
            { action: "open-chat", title: "Open Chat" }
        ]
    };

    return self.registration.showNotification(title, options);
});

// Handle notification click — open the PWA chat panel
self.addEventListener("notificationclick", function(event) {
    event.notification.close();

    var targetUrl = "/phoebe/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
            // If PWA is already open, focus it and navigate to chat
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf("/phoebe") !== -1 && "focus" in client) {
                    client.focus();
                    client.postMessage({
                        type: "NOTIFICATION_CLICK",
                        panel: "panel-chat"
                    });
                    return;
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl + "?panel=chat");
            }
        })
    );
});
