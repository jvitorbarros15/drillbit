(function () {
  const cfg = window.DRILLBIT_CONFIG || {};
  const enabled = !!cfg.posthogKey && navigator.doNotTrack !== "1";

  if (!enabled) {
    window.ANALYTICS = { enabled: false, track() {}, identify() {} };
    return;
  }

  if (!window.posthog) {
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture identify reset".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
  }

  window.posthog.init(cfg.posthogKey, {
    api_host: cfg.posthogHost || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: true,
    persistence: "localStorage",
    disable_session_recording: true
  });

  const safe = fn => { try { fn(); } catch (e) { /* analytics must never break the app */ } };
  window.ANALYTICS = {
    enabled: true,
    track: (event, props) => safe(() => window.posthog.capture(event, props)),
    identify: userId => safe(() => window.posthog.identify(userId))
  };
})();
