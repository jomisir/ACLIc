/**
 * GATE 0 — FALLBACK. Only use this if app.js produced no response at all.
 *
 * This tests the OTHER Passenger convention: the app exports a request
 * handler and never calls .listen() itself, leaving Passenger to mount it.
 *
 * Why this matters: if THIS works and app.js does not, the host cannot run
 * Next.js's standalone server as-is, because that server calls .listen()
 * internally and exports nothing. Knowing which of the two responds tells us
 * whether the host is usable at all — do not skip this if app.js fails.
 *
 * Zero dependencies: Node standard library only.
 */
const http = require("http");

// Passenger's Express-adapter model expects a listener-shaped export. A plain
// Node request handler satisfies it without pulling in Express.
const handler = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(
    "model-b\n\n" +
      "This means Passenger is using the module.exports convention, NOT the\n" +
      "self-listening PORT model. Report this back — it changes the approach.\n\n" +
      `node: ${process.version}\nPORT env: ${process.env.PORT ?? "(not set)"}\n`,
  );
};

// Export in the shapes different Passenger versions look for.
module.exports = handler;
module.exports.default = handler;

// Some Passenger builds still want a server object rather than a bare
// handler, so provide one without binding a port ourselves.
module.exports.server = http.createServer(handler);
