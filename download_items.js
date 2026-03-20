const fs = require('fs');
const path = require('path');

const items = [
  'town-map', 'rare-candy', 'poke-ball', 'exp-share', 'vs-seeker', 'revive', 'star-piece',
  'journal', 'heavy-ball', 'safari-ball', 'ultra-ball', 'old-amber', 'pc-box', 'great-ball',
  'master-ball', 'premier-ball', 'luxury-ball', 'repel', 'tm-normal', 'exp-candys', 'up-grade',
  'pokedex', 'porygon', 'data-card', 'potion'
];

const destDir = path.join(__dirname, 'public', 'images', 'items');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function downloadItems() {
  for (const item of items) {
    const url = `https://play.pokemonshowdown.com/sprites/itemicons/${item}.png`;
    const destPath = path.join(destDir, `${item}.png`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://play.pokemonshowdown.com/'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log(`Downloaded ${item}.png`);
    } catch (error) {
      console.error(`Failed to download ${item}.png: ${error.message}`);
    }
  }
}

downloadItems();
