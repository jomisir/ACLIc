// cPanel/Passenger entry point (LiteSpeed + CloudLinux, "Setup Node.js App").
//
// cPanel's Node.js Selector wants a fixed "Application startup file" name to
// point at, independent of whatever Next.js happens to name its own output.
// This file is that fixed point: it just boots the real server that the CI
// build produced.
//
// Next.js's standalone build (.next/standalone/server.js) already reads
// process.env.PORT and process.env.HOSTNAME and listens itself — Passenger
// assigns PORT and proxies 80/443 to it internally, so nothing here needs to
// call .listen() or otherwise duplicate what that file already does.
//
// This assumes the deploy artifact keeps Next's own layout intact — i.e.
// this file sits at the application root next to a `.next/standalone/`
// directory (see .github/workflows/build-deploy-artifact.yml and deploy.md).
require("./.next/standalone/server.js");
