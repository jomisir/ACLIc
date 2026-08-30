// PM2 process file — run from a full checkout (so `dotenv` is available)
// with `pm2 start deploy/ecosystem.config.js`. It launches the *standalone*
// build output, which must already have been copied into place per
// deploy.md ("node .next/standalone/server.js" is what actually runs).
require("dotenv").config({ path: "/opt/aclic/app/.env.production" });

module.exports = {
  apps: [
    {
      name: "aclic",
      script: "server.js",
      cwd: "/opt/aclic/app", // .next/standalone output copied here, with .next/static and public/ alongside it
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
        ...process.env,
      },
    },
  ],
};
