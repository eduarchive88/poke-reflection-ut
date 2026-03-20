const fs = require('fs');
const path = require('path');

// Mappings from our app's names to PokeAPI's names, or defaults if missing.
// Most are exactly the same.
const items = [
  'town-map', 'rare-candy', 'poke-ball', 'exp-share', 'vs-seeker', 'revive', 'star-piece',
  'journal', 'heavy-ball', 'safari-ball', 'ultra-ball', 'old-amber', 'great-ball',
  'master-ball', 'premier-ball', 'luxury-ball', 'repel', 'tm-normal', 'up-grade',
  'pokedex', 'potion'
];

// Items that might not exist in PokeAPI item sprites directly or need a different name:
// 'pc-box' -> 'box' or something? Let's try downloading anyway.
// 'exp-candys' -> 'exp-candy-s'
// 'porygon' -> this is a pokemon sprite, not an item! We'll fetch from pokemon folder.
// 'data-card' -> maybe doesn't exist.

const destDir = path.join(__dirname, 'public', 'images', 'items');
const pokemonDestDir = path.join(__dirname, 'public', 'images', 'pokemon');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
if (!fs.existsSync(pokemonDestDir)) fs.mkdirSync(pokemonDestDir, { recursive: true });

async function downloadItems() {
  for (const item of items) {
    const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item}.png`;
    const destPath = path.join(destDir, `${item}.png`);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buffer));
        console.log(`Downloaded item: ${item}.png`);
      } else {
        console.log(`Failed item ${item} - HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Error item ${item}: ${error.message}`);
    }
  }

  // Handle special cases
  const specialCases = [
    { name: 'exp-candys', url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-s.png', dest: path.join(destDir, 'exp-candys.png') },
    { name: 'porygon', url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/137.png', dest: path.join(pokemonDestDir, 'porygon.png') },
    // For missing ones like pc-box or data-card, we can use a fallback icon if they fail.
    { name: 'pc-box', url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png', dest: path.join(destDir, 'pc-box.png') }, // fallback
    { name: 'data-card', url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png', dest: path.join(destDir, 'data-card.png') } // fallback
  ];

  for (const special of specialCases) {
    try {
      const response = await fetch(special.url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(special.dest, Buffer.from(buffer));
        console.log(`Downloaded special: ${special.name}.png`);
      } else {
        console.log(`Failed special ${special.name} - HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Error special ${special.name}: ${error.message}`);
    }
  }
}

downloadItems();
