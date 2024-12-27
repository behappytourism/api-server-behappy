module.exports = {
    apps: [
        {
            name: "api-server",
            script: "./src/index.js",
            instances: "max",
            exec_mode: "cluster",
            env_production: {
                NODE_ENV: "production",
            },
            env_development: {
                NODE_ENV: "development",
            },
        },
    ],
};
