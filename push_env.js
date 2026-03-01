const { execSync } = require('child_process');
const fs = require('fs');
try {
    const content = fs.readFileSync('.env.local', 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_FIREBASE_')) {
            const [key, ...vals] = line.split('=');
            const value = vals.join('=');
            if (key && value) {
                console.log(`Pushing ${key} to Vercel...`);
                // Vercel CLI allows piping value for non-interactive env add
                // We add it to all environments: production, preview, development
                try {
                    execSync(`echo ${value} | npx vercel env add ${key} production preview development`, { stdio: 'inherit' });
                } catch (e) { }
            }
        }
    }
    console.log('Finished pushing env variables to Vercel');
} catch (e) {
    console.error('Error:', e);
}
