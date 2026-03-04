import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Replace with your service account key path or logic
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// 포켓몬 스탯 생성 공식 (pokemonData.ts와 동일)
function getPokemonStats(pokemonId, level) {
    const baseH = (pokemonId % 10) * 10 + 50;
    const baseA = (pokemonId % 7) * 5 + 40;
    const baseD = (pokemonId % 5) * 5 + 40;

    return {
        hp: Math.floor(baseH + (level * 2)),
        attack: Math.floor(baseA + (level * 1.5)),
        defense: Math.floor(baseD + (level * 1.2))
    };
}

// 상성 스킬 데이터 (pokemonData.ts 참조)
const TYPE_SKILLS = {
    grass: [
        { name: "덩굴채찍", type: "grass", power: 45 },
        { name: "잎날가르기", type: "grass", power: 55 },
        { name: "솔라빔", type: "grass", power: 120 },
    ],
    fire: [
        { name: "불꽃세례", type: "fire", power: 40 },
        { name: "화염자동차", type: "fire", power: 60 },
        { name: "대문자", type: "fire", power: 110 },
    ],
    water: [
        { name: "물대포", type: "water", power: 40 },
        { name: "하이드로펌프", type: "water", power: 110 },
        { name: "거품광선", type: "water", power: 65 },
    ],
    bug: [
        { name: "벌레먹기", type: "bug", power: 60 },
        { name: "시저크로스", type: "bug", power: 80 },
        { name: "은빛바람", type: "bug", power: 60 },
    ],
    normal: [
        { name: "몸통박치기", type: "normal", power: 40 },
        { name: "박치기", type: "normal", power: 70 },
        { name: "파괴광선", type: "normal", power: 150 },
    ],
    poison: [
        { name: "오물폭탄", type: "poison", power: 90 },
        { name: "독침", type: "poison", power: 15 },
        { name: "베놈쇼크", type: "poison", power: 65 },
    ],
    electric: [
        { name: "전기쇼크", type: "electric", power: 40 },
        { name: "10만볼트", type: "electric", power: 90 },
        { name: "번개", type: "electric", power: 110 },
    ],
    ground: [
        { name: "지진", type: "ground", power: 100 },
        { name: "구멍파기", type: "ground", power: 80 },
        { name: "머드숏", type: "ground", power: 55 },
    ],
    fairy: [
        { name: "문포스", type: "fairy", power: 95 },
        { name: "매지컬샤인", type: "fairy", power: 80 },
        { name: "드레인키스", type: "fairy", power: 50 },
    ],
    fighting: [
        { name: "인파이트", type: "fighting", power: 120 },
        { name: "기합구슬", type: "fighting", power: 120 },
        { name: "카운터", type: "fighting", power: 60 },
    ],
    psychic: [
        { name: "사이코키네시스", type: "psychic", power: 90 },
        { name: "환상빔", type: "psychic", power: 65 },
        { name: "사이코커터", type: "psychic", power: 70 },
    ],
    rock: [
        { name: "스톤샤워", type: "rock", power: 75 },
        { name: "암석봉인", type: "rock", power: 60 },
        { name: "스톤에지", type: "rock", power: 100 },
    ],
    ice: [
        { name: "냉동빔", type: "ice", power: 90 },
        { name: "눈보라", type: "ice", power: 110 },
        { name: "얼음뭉치", type: "ice", power: 40 },
    ],
    ghost: [
        { name: "섀도볼", type: "ghost", power: 80 },
        { name: "핥기", type: "ghost", power: 30 },
        { name: "병상첨병", type: "ghost", power: 65 },
    ],
    dragon: [
        { name: "용의파동", type: "dragon", power: 85 },
        { name: "역린", type: "dragon", power: 120 },
        { name: "용의숨결", type: "dragon", power: 60 },
    ],
    flying: [
        { name: "공중날기", type: "flying", power: 90 },
        { name: "제비반환", type: "flying", power: 60 },
        { name: "폭풍", type: "flying", power: 110 },
    ],
    steel: [
        { name: "러스터캐논", type: "steel", power: 80 },
        { name: "아이언헤드", type: "steel", power: 80 },
        { name: "불릿펀치", type: "steel", power: 40 },
    ]
};

function getRandomSkills(types) {
    const allPossibleSkills = [];
    types.forEach(type => {
        if (TYPE_SKILLS[type]) {
            allPossibleSkills.push(...TYPE_SKILLS[type]);
        }
    });

    allPossibleSkills.push(...TYPE_SKILLS.normal);

    const uniqueSkills = Array.from(new Set(allPossibleSkills.map(s => s.name)))
        .map(name => allPossibleSkills.find(s => s.name === name));

    return uniqueSkills.sort(() => 0.5 - Math.random()).slice(0, 3);
}

async function backfill() {
    console.log("Starting backfill for pokemon_inventory...");
    const snapshot = await db.collection("pokemon_inventory").get();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updates = {};

        if (!data.stats) {
            updates.stats = getPokemonStats(data.pokemonId || 1, data.level || 5);
            needsUpdate = true;
        }

        if (!data.skills || data.skills.length === 0) {
            updates.skills = getRandomSkills(data.types || ["normal"]);
            needsUpdate = true;
        }

        if (needsUpdate) {
            await doc.ref.update(updates);
            console.log(`Updated pokemon doc ID: ${doc.id}`);
            updatedCount++;
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} documents.`);
}

backfill().catch(console.error);
