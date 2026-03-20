const { execSync } = require('child_process');
const fs = require('fs');

try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const lines = env.split(/\r?\n/);

    for (const line of lines) {
        if (line.trim().startsWith('NEXT_PUBLIC_FIREBASE')) {
            const index = line.indexOf('=');
            if (index === -1) continue;

            const name = line.substring(0, index).trim();
            const value = line.substring(index + 1).trim();

            if (!name || !value) continue;

            console.log(`Adding ${name} to Vercel (all envs)...`);
            try {
                // 한 번에 세 환경(production, preview, development) 모두 등록
                execSync(`npx vercel env add ${name} production "${value}" --type encrypted --yes`, { stdio: 'inherit' });
                execSync(`npx vercel env add ${name} preview "${value}" --type encrypted --yes`, { stdio: 'inherit' });
                execSync(`npx vercel env add ${name} development "${value}" --type encrypted --yes`, { stdio: 'inherit' });
            } catch (e) {
                console.warn(`Note: ${name} might already exist or had an issue.`);
            }
        }
    }
    console.log("Environment variables sync complete.");
} catch (err) {
    console.error("Error reading .env.local or executing vercel command:", err);
}
