const { execSync } = require('child_process');
const fs = require('fs');
try {
    const raw = execSync('firebase apps:sdkconfig --project poke-reflection-ut --json', { encoding: 'utf8' });
    const match = raw.match(/(\{[\s\S]*\})/);
    if (match) {
        const config = JSON.parse(match[1]);
        if (config.result && config.result.sdkConfig) {
            const app = config.result.sdkConfig;
            const envs = Object.entries(app).map(([key, val]) => {
                const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
                return `NEXT_PUBLIC_FIREBASE_${envKey}=${val}`;
            }).join('\n');
            fs.appendFileSync('.env.local', '\n' + envs + '\n');
            console.log('Env variables appended to .env.local');
        }
    }
} catch (e) {
    console.error('Error:', e);
}
