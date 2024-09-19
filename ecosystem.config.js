module.exports = {
  apps: [
    {
      name: "wifiConnectionChecking",
      script: "./index.js",
      cwd: "C:/wamp64/www/wifiConnectionChecking",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
