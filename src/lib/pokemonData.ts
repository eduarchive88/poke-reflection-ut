export interface PokemonSkill {
    name: string;
    type: string;
    power: number;
}

export interface PokemonBaseData {
    id: number;
    koName: string;
    enName: string;
    types: string[];
    baseStats: {
        hp: number;
        attack: number;
        defense: number;
    };
}

export const POKEMON_KR_NAMES: Record<number, string> = {
    1: "이상해씨", 2: "이상해풀", 3: "이상해꽃", 4: "파이리", 5: "리자드", 6: "리자몽",
    7: "꼬부기", 8: "어니부기", 9: "거북왕", 10: "캐터피", 11: "단데기", 12: "버터플",
    13: "뿔충이", 14: "딱충이", 15: "독침붕", 16: "구구", 17: "피죤", 18: "피죤투",
    19: "꼬렛", 20: "레트라", 21: "깨비참", 22: "깨비드릴조", 23: "아보", 24: "아보크",
    25: "피카츄", 26: "라이츄", 27: "모래두지", 28: "고지", 29: "니드런♀", 30: "니드리나",
    31: "니드퀸", 32: "니드런♂", 33: "니드리노", 34: "니드킹", 35: "삐삐", 36: "픽시",
    37: "식스테일", 38: "나인테일", 39: "푸린", 40: "푸크린", 41: "주뱃", 42: "골뱃",
    43: "뚜벅쵸", 44: "냄새꼬", 45: "라플레시아", 46: "파라스", 47: "파라섹트", 48: "콘팡",
    49: "도나리", 50: "디그다", 51: "닥트리오", 52: "나옹", 53: "페르시온", 54: "고라파덕",
    55: "골덕", 56: "망키", 57: "성원숭", 58: "가디", 59: "윈디", 60: "발챙이",
    61: "슈륙챙이", 62: "강챙이", 63: "캐시", 64: "윤겔라", 65: "후딘", 66: "알통몬",
    67: "근육몬", 68: "괴력몬", 69: "모다피", 70: "우츠동", 71: "우츠보트", 72: "왕눈해",
    73: "독파리", 74: "꼬마돌", 75: "데구리", 76: "딱구리", 77: "포니타", 78: "날쌩마",
    79: "야돈", 80: "야도란", 81: "코일", 82: "레어코일", 83: "파오리", 84: "두두",
    85: "두트리오", 86: "쥬쥬", 87: "쥬레곤", 88: "질퍽이", 89: "질뻐기", 90: "셀러",
    91: "파르셀", 92: "고오스", 93: "고우스트", 94: "팬텀", 95: "롱스톤", 96: "슬리프",
    97: "슬리퍼", 98: "크랩", 99: "킹크랩", 100: "찌리리공", 101: "붐볼", 102: "아라리",
    103: "나시", 104: "탕구리", 105: "텅구리", 106: "시와라", 107: "홍수몬", 108: "내루미",
    109: "또가스", 110: "또도가스", 111: "뿔카노", 112: "코뿌리", 113: "럭키", 114: "덩쿠리",
    115: "캥카", 116: "쏘드라", 117: "시드라", 118: "콘치", 119: "왕콘치", 120: "별가사리",
    121: "아쿠스타", 122: "마임맨", 123: "스라크", 124: "루주라", 125: "에레브", 126: "마그마",
    127: "쁘사이저", 128: "켄타로스", 129: "잉어킹", 130: "갸라도스", 131: "라프라스", 132: "메타몽",
    133: "이브이", 134: "샤미드", 135: "쥬피썬더", 136: "부스터", 137: "폴리곤", 138: "암나이트",
    139: "암스타", 140: "투구", 141: "투구푸스", 142: "프테라", 143: "잠만보", 144: "프리져",
    145: "썬더", 146: "파이어", 147: "미뇽", 148: "신뇽", 149: "망나뇽", 150: "뮤츠", 151: "뮤"
};

export const TYPE_SKILLS: Record<string, PokemonSkill[]> = {
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

export function getPokemonStats(pokemonId: number, level: number) {
    // 간단한 스탯 생성 공식
    const baseH = (pokemonId % 10) * 10 + 50;
    const baseA = (pokemonId % 7) * 5 + 40;
    const baseD = (pokemonId % 5) * 5 + 40;

    return {
        hp: Math.floor(baseH + (level * 2)),
        attack: Math.floor(baseA + (level * 1.5)),
        defense: Math.floor(baseD + (level * 1.2))
    };
}

export function getRandomSkills(types: string[]): PokemonSkill[] {
    const allPossibleSkills: PokemonSkill[] = [];
    types.forEach(type => {
        if (TYPE_SKILLS[type]) {
            allPossibleSkills.push(...TYPE_SKILLS[type]);
        }
    });

    // 기본 노말 스킬 추가
    allPossibleSkills.push(...TYPE_SKILLS.normal);

    // 중복 제거 및 랜덤 3개 선택
    const uniqueSkills = Array.from(new Set(allPossibleSkills.map(s => s.name)))
        .map(name => allPossibleSkills.find(s => s.name === name)!);

    return uniqueSkills.sort(() => 0.5 - Math.random()).slice(0, 3);
}

export function getSkillData(skillName: string): PokemonSkill | null {
    for (const type in TYPE_SKILLS) {
        const skill = TYPE_SKILLS[type].find(s => s.name === skillName);
        if (skill) return skill;
    }
    return null;
}

// 배틀 스킬 확률 선택 시스템
// 기본 공격(몸통박치기) 30% + 보유 스킬 중 하나 70%
export function selectBattleSkill(skills: string[] | undefined): PokemonSkill {
    const basicAttack: PokemonSkill = { name: "몸통박치기", type: "normal", power: 40 };

    // 스킬이 없으면 항상 기본 공격
    if (!skills || skills.length === 0) return basicAttack;

    // 30% 확률로 기본 공격 사용
    if (Math.random() < 0.3) return basicAttack;

    // 70% 확률로 보유 스킬 중 하나 (랜덤 추출을 통한 골고루 사용)
    const validSkills = skills
        .map(name => getSkillData(name))
        .filter((s): s is PokemonSkill => s !== null);

    if (validSkills.length === 0) return basicAttack;

    const randomIndex = Math.floor(Math.random() * validSkills.length);
    return validSkills[randomIndex];
}

export function calculateDamage(attackerLevel: number, attackerAttack: number, defenderDefense: number, skillPower: number, effectiveness: number): number {
    // 포켓몬스터 전통적인 데미지 공식과 유사하면서도 단순화한 형태
    // ((레벨 * 2 / 5 + 2) * 위력 * 공격력 / 방어력) / 50 + 2
    const baseDamage = Math.floor((((attackerLevel * 2 / 5 + 2) * skillPower * attackerAttack) / defenderDefense) / 50 + 2);
    // 상성 적용 및 랜덤 데미지 (0.85 ~ 1.0)
    const randomFactor = Math.random() * (1.0 - 0.85) + 0.85;
    return Math.max(1, Math.floor(baseDamage * effectiveness * randomFactor));
}
