/*
 * Adaptador de salas por Bluetooth para el APK.
 * Imita la parte de la API de salas que usa el juego (join → presence / onPeers / peers / leave)
 * pero por Google Nearby Connections, sin internet. El anfitrión anuncia "odin|CÓDIGO",
 * los invitados lo buscan, se conectan y cada lado manda su estado ("presencia") como JSON.
 */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var N = C.Plugins && C.Plugins.OdinNearby;
  if (!N) return;

  var current = null;

  function makeRoom(name, code, role) {
    var r = { my: {}, peers: {}, connected: {}, handlers: [], subs: [], closed: false, connecting: false, sendT: 0 };

    function snapshot() {
      var now = Date.now();
      var list = [{ peer: 'me', by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false,
        presence: Object.freeze(JSON.parse(JSON.stringify(r.my))), updatedAt: now }];
      Object.keys(r.peers).forEach(function (id) {
        list.push({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: r.peers[id], updatedAt: now });
      });
      return Object.freeze(list);
    }
    function notify() {
      var s = snapshot();
      r.handlers.forEach(function (h) { setTimeout(function () { if (!r.closed) h({ peers: s, joined: [], left: [], updated: [] }); }, 0); });
    }
    function sendTo(id) {
      N.send({ id: id, data: JSON.stringify({ t: 'p', p: r.my }) }).catch(function () {});
    }
    function sendAll() {
      if (r.sendT) return;
      r.sendT = setTimeout(function () {
        r.sendT = 0;
        Object.keys(r.connected).forEach(sendTo);
      }, 30);
    }
    function listen(ev, fn) { r.subs.push(N.addListener(ev, fn)); }

    listen('message', function (e) {
      if (r.closed) return;
      try {
        var m = JSON.parse(e.data);
        if (m && m.t === 'p' && m.p && typeof m.p === 'object') { r.peers[e.id] = Object.freeze(m.p); notify(); }
      } catch (x) { /* mensaje roto: se ignora */ }
    });
    listen('connected', function (e) {
      if (r.closed) return;
      r.connected[e.id] = 1; r.connecting = false;
      if (role === 'guest') N.stopDiscovery().catch(function () {});
      sendTo(e.id);
    });
    listen('disconnected', function (e) {
      delete r.connected[e.id]; delete r.peers[e.id];
      if (r.closed) return;
      notify();
      if (role === 'guest') { r.connecting = false; N.startDiscovery().catch(function () {}); }
    });
    listen('connectFailed', function () {
      r.connecting = false;
      if (role === 'guest' && !r.closed) N.startDiscovery().catch(function () {});
    });
    listen('endpointFound', function (e) {
      if (role !== 'guest' || r.closed || r.connecting || Object.keys(r.connected).length) return;
      var parts = String(e.name || '').split('|');
      if (parts[0] !== 'odin' || parts[1] !== code) return;
      r.connecting = true;
      N.connect({ id: e.id, name: 'odin|' + code + '|invitado' }).catch(function () { r.connecting = false; });
    });

    var api = {
      name: name,
      presence: function (patch) {
        if (r.closed) return Promise.reject({ code: 'invalid_argument', message: 'Ya saliste de la sala.' });
        Object.keys(patch || {}).forEach(function (k) {
          if (patch[k] === null) delete r.my[k];
          else r.my[k] = JSON.parse(JSON.stringify(patch[k]));
        });
        notify(); sendAll();
        return Promise.resolve();
      },
      onPeers: function (h) {
        r.handlers.push(h);
        setTimeout(function () { if (!r.closed) h({ peers: snapshot(), joined: [], left: [], updated: [] }); }, 0);
        return function () { r.handlers = r.handlers.filter(function (x) { return x !== h; }); };
      },
      peers: snapshot,
      connected: function () { return Object.keys(r.connected).length > 0; },
      onConnection: function (h) { setTimeout(function () { h(api.connected()); }, 0); return function () {}; },
      emit: function () { return Promise.resolve(); },
      on: function () { return function () {}; },
      leave: function () {
        if (r.closed) return Promise.resolve();
        r.closed = true;
        r.subs.forEach(function (p) { Promise.resolve(p).then(function (h) { h && h.remove && h.remove(); }); });
        if (current === api) current = null;
        return N.stop().catch(function () {});
      }
    };
    return api;
  }

  window.__odinNearby = {
    bluetooth: true,
    join: function (name, role) {
      var code = String(name).replace(/^odin-/, '').toUpperCase();
      var start = function () {
        return N.requestPerms().then(function (res) {
          if (!res || !res.granted) {
            throw { code: 'nearby_perms', message: 'Necesito permiso de Bluetooth y de "Dispositivos cercanos" para jugar. Activalos y probá de nuevo.' };
          }
          var room = makeRoom(name, code, role === 'host' ? 'host' : 'guest');
          current = room;
          var go = role === 'host' ? N.startAdvertising({ name: 'odin|' + code }) : N.startDiscovery();
          return go.then(function () { return room; }, function (err) {
            room.leave();
            throw { code: 'nearby_failed', message: 'No se pudo usar el Bluetooth (' + ((err && err.message) || 'error') + '). Revisá que esté activado y probá de nuevo.' };
          });
        });
      };
      return current ? current.leave().then(start) : start();
    }
  };
})();
