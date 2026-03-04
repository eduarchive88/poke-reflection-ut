"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getSkillData, calculateDamage, selectBattleSkill } from "@/lib/pokemonData";

// 간단한 상성 차트 (1.0 = 보통, 3.0 = 효과 좋음, 0.33 = 효과 별로)
const TYPE_CHART: Record<string, Record<string, number>> = {
    fire: { grass: 3, ice: 3, bug: 3, steel: 3, fire: 0.33, water: 0.33, rock: 0.33, dragon: 0.33 },
    water: { fire: 3, ground: 3, rock: 3, water: 0.33, grass: 0.33, dragon: 0.33 },
    grass: { water: 3, ground: 3, rock: 3, grass: 0.33, fire: 0.33, poison: 0.33, flying: 0.33, bug: 0.33, dragon: 0.33, steel: 0.33 },
    electric: { water: 3, flying: 3, electric: 0.33, grass: 0.33, dragon: 0.33, ground: 0 },
    normal: { rock: 0.33, steel: 0.33, ghost: 0 },
    bug: { grass: 3, psychic: 3, dark: 3, fire: 0.33, fighting: 0.33, poison: 0.33, flying: 0.33, ghost: 0.33, steel: 0.33, fairy: 0.33 },
    poison: { grass: 3, fairy: 3, poison: 0.33, ground: 0.33, rock: 0.33, ghost: 0.33, steel: 0 },
    ground: { fire: 3, electric: 3, poison: 3, rock: 3, steel: 3, grass: 0.33, bug: 0.33, flying: 0 },
    flying: { grass: 3, fighting: 3, bug: 3, electric: 0.33, rock: 0.33, steel: 0.33 },
    psychic: { fighting: 3, poison: 3, psychic: 0.33, steel: 0.33, dark: 0 },
    rock: { fire: 3, ice: 3, flying: 3, bug: 3, fighting: 0.33, ground: 0.33, steel: 0.33 },
    ice: { grass: 3, ground: 3, flying: 3, dragon: 3, fire: 0.33, water: 0.33, ice: 0.33, steel: 0.33 },
    ghost: { psychic: 3, ghost: 3, normal: 0, dark: 0.33 },
    dragon: { dragon: 3, steel: 0.33, fairy: 0 },
    steel: { ice: 3, rock: 3, fairy: 3, fire: 0.33, water: 0.33, electric: 0.33, steel: 0.33 },
    dark: { psychic: 3, ghost: 3, fighting: 0.33, dark: 0.33, fairy: 0.33 },
    fairy: { fighting: 3, dragon: 3, dark: 3, fire: 0.33, poison: 0.33, steel: 0.33 },
    fighting: { normal: 3, ice: 3, rock: 3, dark: 3, steel: 3, poison: 0.33, flying: 0.33, psychic: 0.33, bug: 0.33, fairy: 0.33, ghost: 0 }
};

const getEffectiveness = (moveTypes: string[], targetTypes: string[]) => {
    let multiplier = 1.0;
    for (const m of moveTypes) {
        const chart = TYPE_CHART[m] || {};
        for (const t of targetTypes) {
            multiplier *= (chart[t] !== undefined ? chart[t] : 1.0);
        }
    }
    return multiplier;
};

export const dynamic = 'force-dynamic';

export default function StadiumPage() {
    const router = useRouter();

    interface PokemonData {
        id: string;
        name: string;
        koName?: string;
        image: string;
        level: number;
        types: string[];
        skills?: string[];
        stats?: { hp: number; attack: number; defense: number };
        studentId: string;
    }

    interface SessionData {
        studentId: string;
        classId: string;
        name: string;
    }

    const [session, setSession] = useState<SessionData | null>(null);
    const [myPokemon, setMyPokemon] = useState<PokemonData[]>([]);
    const [opponents, setOpponents] = useState<PokemonData[]>([]);
    const [loading, setLoading] = useState(true);

    const [gameState, setGameState] = useState<"select" | "battle" | "result">("select");
    const [selectedMyPoke, setSelectedMyPoke] = useState<PokemonData | null>(null);
    const [selectedOpponent, setSelectedOpponent] = useState<PokemonData | null>(null);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [winner, setWinner] = useState<string | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchData(sessionData.studentId, sessionData.classId);
    }, [router]);

    const fetchData = async (studentId: string, classId: string) => {
        try {
            const myQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const mySnap = await getDocs(myQ);
            const myP: PokemonData[] = [];
            mySnap.forEach(doc => myP.push({ id: doc.id, ...doc.data() } as PokemonData));
            setMyPokemon(myP);

            const oppQ = query(collection(db, "pokemon_inventory"), where("studentId", "!=", studentId), limit(15));
            const oppSnap = await getDocs(oppQ);
            const oppP: PokemonData[] = [];
            oppSnap.forEach(doc => oppP.push({ id: doc.id, ...doc.data() } as PokemonData));
            setOpponents(oppP);
        } catch (error) {
            console.error(error);
            toast.error("데이터 로드 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    const startBattle = (myPoke: PokemonData) => {
        if (opponents.length === 0) {
            toast.error("대결할 상대가 아직 없습니다.");
            return;
        }
        const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
        setSelectedMyPoke(myPoke);
        setSelectedOpponent(randomOpp);
        setGameState("battle");
        runBattleSimulation(myPoke, randomOpp);
    };

    const runBattleSimulation = async (player: PokemonData, enemy: PokemonData) => {
        const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
        const logs: string[] = [
            "▶ 스타디움 배틀 시작!",
            `▶ ${player.koName || player.name} VS ${enemy.koName || enemy.name}`
        ];
        setBattleLog([...logs]);

        let pHp = (player.stats?.hp || 100) + ((player.level || 5) * 2);
        let eHp = (enemy.stats?.hp || 100) + ((enemy.level || 5) * 2);
        let turn = 1;

        let pBasicCount = 0;
        let eBasicCount = 0;

        await wait(2000);

        while (pHp > 0 && eHp > 0) {
            // 확률 기반 스킬 선택 (기본공격 카운트 반영)
            const pSkillSelection = selectBattleSkill(player.skills, pBasicCount);
            const eSkillSelection = selectBattleSkill(enemy.skills, eBasicCount);

            const pSkill = pSkillSelection.skill;
            const eSkill = eSkillSelection.skill;

            if (pSkillSelection.isBasic) pBasicCount++;
            else pBasicCount = 0;

            if (eSkillSelection.isBasic) eBasicCount++;
            else eBasicCount = 0;

            const pEff = getEffectiveness([pSkill.type], enemy.types);
            const eEff = getEffectiveness([eSkill.type], player.types);

            const pDmg = calculateDamage(player.level || 5, player.stats?.attack || 40, enemy.stats?.defense || 40, pSkill.power, pEff);
            const eDmg = calculateDamage(enemy.level || 5, enemy.stats?.attack || 40, player.stats?.defense || 40, eSkill.power, eEff);

            if (turn % 2 !== 0) {
                eHp -= pDmg;
                logs.push(`▶ ${player.koName || player.name}의 [${pSkill.name}]! ${pDmg} 데미지!`);
                if (pEff > 1) logs.push("▶ 앗! 효과가 굉장했다!");
                else if (pEff < 1) logs.push("▶ 효과가 별로인 듯하다...");
            } else {
                pHp -= eDmg;
                logs.push(`▶ ${enemy.koName || enemy.name}의 [${eSkill.name}]! ${eDmg} 데미지!`);
                if (eEff > 1) logs.push("▶ 앗! 효과가 굉장했다!");
                else if (eEff < 1) logs.push("▶ 효과가 별로인 듯하다...");
            }

            setBattleLog([...logs.slice(-6)]);
            turn++;
            await wait(1500);
        }

        // 결과 처리
        const playerWon = pHp > 0;
        if (playerWon) {
            setWinner("player");
            logs.push(`▶ ${enemy.koName || enemy.name}이(가) 쓰러졌다!`);
            logs.push("▶ 당신의 승리!");
        } else {
            setWinner("enemy");
            logs.push(`▶ ${player.koName || player.name}이(가) 지쳤다...`);
            logs.push("▶ 상대의 승리!");
        }
        setBattleLog([...logs.slice(-6)]);

        try {
            await addDoc(collection(db, "battle_logs"), {
                classId: session?.classId,
                winnerId: playerWon ? player.studentId : enemy.studentId,
                winnerName: playerWon ? (session?.name || "나") : "상대",
                loserId: playerWon ? enemy.studentId : player.studentId,
                loserName: playerWon ? "상대" : (session?.name || "나"),
                winnerPoke: playerWon ? (player.koName || player.name) : (enemy.koName || enemy.name),
                loserPoke: playerWon ? (enemy.koName || enemy.name) : (player.koName || player.name),
                createdAt: serverTimestamp(),
                type: 'stadium'
            });
        } catch (e) {
            console.error("배틀 로그 저장 실패:", e);
        }

        setTimeout(() => setGameState("result"), 2000);
    };

    if (!session) return null;

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-none hover:bg-gray-200 border-2 border-transparent hover:border-black transition-none h-12 w-12"
                    >
                        <span className="text-2xl">◀</span>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500 border-2 border-black flex items-center justify-center w-12 h-12">
                            <span className="text-white text-2xl">⚔️</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black pixel-text uppercase">Battle Stadium</h2>
                            <p className="text-[10px] sm:text-xs text-gray-600 font-bold pixel-text uppercase mt-1">친선 대결장</p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === "select" && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between pixel-box bg-white p-4">
                            <h3 className="text-sm sm:text-base font-bold pixel-text flex items-center gap-2">
                                🎒 나의 포켓몬 선택
                            </h3>
                            <span className="text-[10px] sm:text-xs font-black text-gray-500 pixel-text">보유: {myPokemon.length}</span>
                        </div>

                        {loading ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 pixel-box bg-gray-200 animate-pulse border-4 border-dashed border-gray-400" />
                                ))}
                            </div>
                        ) : myPokemon.length === 0 ? (
                            <div className="pixel-box bg-white p-8 sm:p-12 text-center">
                                <span className="text-4xl mb-4 block">✨</span>
                                <p className="text-lg sm:text-xl font-bold pixel-text mb-2">아직 포켓몬이 없습니다!</p>
                                <p className="text-xs sm:text-sm text-gray-500 pixel-text mb-6">성찰 일기를 작성하여 포켓몬을 얻어보세요.</p>
                                <Button onClick={() => router.push("/student/write")} className="pixel-button bg-blue-500 text-white hover:bg-blue-600">일기 쓰러 가기</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {myPokemon.map(poke => (
                                    <div
                                        key={poke.id}
                                        className="pixel-box bg-white p-3 sm:p-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all relative group"
                                        onClick={() => startBattle(poke)}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 h-full">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 border-2 border-black flex items-center justify-center p-1 sm:p-2 relative shrink-0">
                                                <img src={poke.image} alt={poke.name} className="w-full h-full object-contain pixelated" />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                                                    <h4 className="font-bold pixel-text text-sm sm:text-base truncate" title={poke.koName || poke.name}>
                                                        {poke.koName || poke.name}
                                                    </h4>
                                                    <span className="text-[10px] font-bold bg-yellow-300 border border-black px-1 py-0.5 whitespace-nowrap self-start sm:self-auto">Lv.{poke.level}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {poke.types.map((t) => (
                                                        <span key={t} className="text-[8px] sm:text-[10px] bg-gray-200 border border-black px-1 py-0.5 uppercase pixel-text">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/10 hidden group-hover:flex items-center justify-center">
                                            <span className="bg-red-500 text-white pixel-text text-sm sm:text-base px-3 py-1 border-2 border-black animate-pulse">출전!</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {gameState === "battle" && selectedMyPoke && selectedOpponent && (
                    <motion.div
                        key="battle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center space-y-8 py-4 sm:py-8"
                    >
                        <div className="flex justify-between items-end w-full max-w-4xl relative px-2 sm:px-12">
                            {/* Player */}
                            <motion.div
                                className="flex flex-col items-center z-10 w-2/5 sm:w-1/3"
                                animate={{ x: [0, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48">
                                    <img src={selectedMyPoke.image} className="w-full h-full object-contain pixelated drop-shadow-[0_8px_0_rgba(0,0,0,0.2)]" alt={selectedMyPoke.name} />
                                </div>
                                <div className="pixel-box bg-white p-2 sm:p-3 mt-4 w-full text-center">
                                    <p className="font-bold pixel-text text-[10px] sm:text-sm md:text-base truncate" title={selectedMyPoke.koName || selectedMyPoke.name}>
                                        {selectedMyPoke.koName || selectedMyPoke.name}
                                    </p>
                                    <span className="text-[8px] sm:text-[10px] font-bold inline-block mt-1 bg-blue-100 border border-black px-1 sm:px-2 py-0.5 whitespace-nowrap">내 포켓몬</span>
                                </div>
                            </motion.div>

                            <div className="text-3xl flex-shrink-0 sm:text-5xl md:text-6xl font-black pixel-text text-red-500 animate-pulse z-10 pb-16 sm:pb-24">VS</div>

                            {/* Enemy */}
                            <motion.div
                                className="flex flex-col items-center z-10 w-2/5 sm:w-1/3"
                                animate={{ x: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            >
                                <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48">
                                    <img src={selectedOpponent.image} className="w-full h-full object-contain pixelated drop-shadow-[0_8px_0_rgba(0,0,0,0.2)]" alt={selectedOpponent.name} />
                                </div>
                                <div className="pixel-box bg-white p-2 sm:p-3 mt-4 w-full text-center cursor-help" title={`상대: ${selectedOpponent.studentId}`}>
                                    <p className="font-bold pixel-text text-[10px] sm:text-sm md:text-base truncate">
                                        {selectedOpponent.koName || selectedOpponent.name}
                                    </p>
                                    <span className="text-[8px] sm:text-[10px] font-bold inline-block mt-1 bg-red-100 border border-black px-1 sm:px-2 py-0.5 whitespace-nowrap">상대 포켓몬</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Battle Log Box */}
                        <div className="w-full max-w-2xl pixel-box bg-white p-4 sm:p-6 relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200" />
                            <div className="space-y-3 h-48 sm:h-56 overflow-y-auto pr-2 custom-scrollbar mt-2 flex flex-col justify-end pb-2">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-xs sm:text-sm md:text-base font-bold pixel-text text-black leading-relaxed"
                                    >
                                        ▶ {log}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {gameState === "result" && selectedMyPoke && selectedOpponent && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-6 sm:py-10 px-2 sm:px-4 w-full max-w-4xl mx-auto"
                    >
                        <div className="relative mb-6 sm:mb-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                className={`text-4xl sm:text-6xl md:text-8xl font-black pixel-text drop-shadow-[2px_2px_0_rgba(0,0,0,1)] sm:drop-shadow-[4px_4px_0_rgba(0,0,0,1)] ${winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`}
                            >
                                {winner === 'player' ? '승리!' : '패배...'}
                            </motion.div>
                        </div>

                        <div className="pixel-box bg-white p-4 sm:p-6 mb-6 sm:mb-8 text-center w-full">
                            <p className="text-sm sm:text-lg md:text-xl font-bold pixel-text leading-tight">
                                {winner === 'player'
                                    ? <span className="text-blue-600">{selectedMyPoke.koName || selectedMyPoke.name}의 화려한 승리!</span>
                                    : <span className="text-red-600">아쉽지만 {selectedOpponent.koName || selectedOpponent.name}의 승리입니다.</span>}
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 w-full">
                            <div className="pixel-box bg-white p-4 sm:p-6 flex flex-col items-center relative overflow-hidden">
                                {winner === 'player' && <div className="absolute inset-0 bg-yellow-300 opacity-20 animate-pulse" />}
                                <h5 className="text-[10px] sm:text-xs font-black pixel-text text-gray-800 mb-2 sm:mb-4 bg-gray-200 px-2 sm:px-3 py-1 border-2 border-black inline-block z-10 w-fit">
                                    🏆 최종 승자
                                </h5>
                                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center p-2 mb-2 sm:mb-4 bg-gray-50 border-2 border-black z-10">
                                    <img
                                        src={winner === 'player' ? selectedMyPoke.image : selectedOpponent.image}
                                        className="w-full h-full object-contain pixelated hover:scale-110 transition-transform"
                                        alt="winner"
                                    />
                                </div>
                                <span className="font-black text-sm sm:text-lg md:text-xl pixel-text text-center z-10 w-full px-2" style={{ wordBreak: 'keep-all' }}>
                                    {winner === 'player' ? (selectedMyPoke.koName || selectedMyPoke.name) : (selectedOpponent.koName || selectedOpponent.name)}
                                </span>
                            </div>

                            <div className="pixel-box bg-gray-100 p-4 sm:p-6 flex flex-col justify-center gap-3 sm:gap-4">
                                <div className="pixel-box bg-white p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                                    <span className="text-xl sm:text-2xl">⭐</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-gray-500">경험치 보상</p>
                                        <p className="font-bold pixel-text text-[10px] sm:text-sm">경험치 획득!</p>
                                    </div>
                                </div>
                                <div className="pixel-box bg-white p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                                    <span className="text-xl sm:text-2xl">🏆</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-gray-500">시즌 점수</p>
                                        <p className="font-bold pixel-text text-[10px] sm:text-sm">{winner === 'player' ? '+15 BP' : '+0 BP'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12 w-full max-w-md">
                            <Button
                                size="lg"
                                onClick={() => setGameState("select")}
                                className="flex-1 pixel-button bg-gray-200 text-black hover:bg-gray-300 h-12 sm:h-14 text-sm sm:text-base border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-none"
                            >
                                다시 도전
                            </Button>
                            <Button
                                size="lg"
                                onClick={() => router.push("/student")}
                                className="flex-1 pixel-button bg-blue-500 text-white hover:bg-blue-600 h-12 sm:h-14 text-sm sm:text-base border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-none"
                            >
                                메뉴 복귀
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
