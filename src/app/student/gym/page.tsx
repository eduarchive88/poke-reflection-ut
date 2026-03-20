"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc,
    setDoc, updateDoc, serverTimestamp, increment,
    writeBatch, addDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PokemonImage } from "@/components/PokemonImage";
import { getSkillData, calculateDamage, selectBattleSkill } from "@/lib/pokemonData";

// 상성 데이터
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

// 상성 배율 계산 함수
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

// 타입별 색상 매핑
const TYPE_COLORS: Record<string, string> = {
    fire: "bg-orange-500", water: "bg-blue-500", grass: "bg-green-500",
    electric: "bg-yellow-400", normal: "bg-gray-400", bug: "bg-lime-500",
    poison: "bg-purple-500", ground: "bg-amber-600", flying: "bg-indigo-300",
    psychic: "bg-pink-500", rock: "bg-amber-700", ice: "bg-cyan-300",
    ghost: "bg-purple-700", dragon: "bg-violet-600", steel: "bg-slate-400",
    dark: "bg-gray-700", fairy: "bg-pink-300", fighting: "bg-red-700"
};

interface PokemonData {
    id: string;
    studentId: string;
    pokemonId: number;
    name: string;
    koName?: string;
    image: string;
    level: number;
    types: string[];
    skills?: string[];
    stats?: {
        hp: number;
        attack: number;
        defense: number;
    };
    retiredUntil?: any;
}

interface GymData {
    leaderId: string | null;
    leaderName: string | null;
    pokemon: PokemonData | null;
    lastRewardAt: any;
    occupiedAt: any;
    defenseCount?: number;
}

export default function GymPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [gym, setGym] = useState<GymData | null>(null);
    const [myPokemon, setMyPokemon] = useState<PokemonData[]>([]);
    const [loading, setLoading] = useState(true);

    const [gameState, setGameState] = useState<"info" | "select" | "battle" | "result">("info");
    const [selectedMyPoke, setSelectedMyPoke] = useState<PokemonData | null>(null);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [winner, setWinner] = useState<"player" | "leader" | null>(null);
    const [hitEffect, setHitEffect] = useState<"player" | "opponent" | "none">("none");

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

    // 데이터 로드 함수
    const fetchData = async (studentId: string, classId: string) => {
        setLoading(true);
        try {
            // 1. 체육관 정보 가져오기
            const gymRef = doc(db, "gyms", classId);
            const gymDoc = await getDoc(gymRef);

            if (gymDoc.exists()) {
                const currentGymData = gymDoc.data() as GymData;

                // 체육관 포켓몬 정보 최신화 (도감에서 레벨업 등 반영)
                if (currentGymData.pokemon?.id) {
                    const pokeRef = doc(db, "pokemon_inventory", currentGymData.pokemon.id);
                    const pokeDoc = await getDoc(pokeRef);
                    if (pokeDoc.exists()) {
                        currentGymData.pokemon = { id: pokeDoc.id, ...pokeDoc.data() } as PokemonData;
                    }
                }

                setGym(currentGymData);
                await checkWeeklyReward(studentId, classId, currentGymData);
            } else {
                // 체육관이 없으면 빈 체육관 생성
                const initialGym: GymData = {
                    leaderId: null,
                    leaderName: null,
                    pokemon: null,
                    lastRewardAt: serverTimestamp(),
                    occupiedAt: serverTimestamp(),
                    defenseCount: 0
                };
                await setDoc(gymRef, initialGym);
                setGym(initialGym);
            }

            // 2. 내 포켓몬 (리타이어 안 된 것만)
            const now = new Date();
            const myQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const mySnap = await getDocs(myQ);
            const list: PokemonData[] = [];
            mySnap.forEach(docSnap => {
                const data = docSnap.data();
                let retiredUntilDate = null;
                if (data.retiredUntil) {
                    try {
                        if (typeof data.retiredUntil.toDate === 'function') {
                            retiredUntilDate = data.retiredUntil.toDate();
                        } else if (data.retiredUntil instanceof Date) {
                            retiredUntilDate = data.retiredUntil;
                        } else if (data.retiredUntil.seconds) {
                            retiredUntilDate = new Date(data.retiredUntil.seconds * 1000);
                        }
                    } catch (e) {
                        console.warn("retiredUntil conversion failed:", e);
                    }
                }
                if (!retiredUntilDate || retiredUntilDate < now) {
                    list.push({ id: docSnap.id, ...data } as PokemonData);
                }
            });
            setMyPokemon(list);
        } catch (error) {
            console.error("fetchData Error:", error);
            toast.error("데이터 동기화 중 오류 발생. 새로고침 해주세요.");
        } finally {
            setLoading(false);
        }
    };

    // 주간 보상 체크
    const checkWeeklyReward = async (studentId: string, classId: string, currentGym: GymData) => {
        if (!currentGym || currentGym.leaderId !== studentId) return;
        let lastReward = new Date(0);
        if (currentGym.lastRewardAt) {
            try {
                if (typeof currentGym.lastRewardAt.toDate === 'function') {
                    lastReward = currentGym.lastRewardAt.toDate();
                } else if (currentGym.lastRewardAt.seconds) {
                    lastReward = new Date(currentGym.lastRewardAt.seconds * 1000);
                }
            } catch (e) { /* ignore */ }
        }
        const now = new Date();
        const diffDays = (now.getTime() - lastReward.getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 7) {
            try {
                const batch = writeBatch(db);
                batch.update(doc(db, "students", studentId), { candies: increment(3) });
                batch.update(doc(db, "gyms", classId), { lastRewardAt: serverTimestamp() });

                // 학생 활동 로그 기록 (주간 보상)
                const logRef = doc(collection(db, "student_logs"));
                batch.set(logRef, {
                    studentId: studentId,
                    classId: classId,
                    type: "candy_gain",
                    title: "체육관 주간 보상! 🍬",
                    description: "체육관을 1주일 동안 지켜서 캔디 3개를 획득했습니다!",
                    details: {
                        amount: 3,
                        reason: "gym_weekly_reward"
                    },
                    createdAt: serverTimestamp()
                });

                await batch.commit();
                toast.success("🍬 체육관 보상! 캔디 3개를 획득했습니다!");
            } catch (e) {
                console.error("보상 지급 실패:", e);
            }
        }
    };

    // 도전 시작 (포켓몬 선택 후)
    const startChallenge = (poke: PokemonData) => {
        setSelectedMyPoke(poke);
        setGameState("battle");
        setBattleLog([]);
        setWinner(null);
        runBattle(poke);
    };

    // 배틀 실행
    const runBattle = async (player: PokemonData) => {
        // 빈 체육관이면 즉시 점령
        if (!gym?.pokemon || !gym?.leaderId) {
            setBattleLog(["빈 체육관을 발견했습니다!", `${player.koName || player.name}(이)가 체육관을 차지합니다!`]);
            setWinner("player");
            await handleOccupy(player);
            setTimeout(() => setGameState("result"), 2000);
            return;
        }

        const enemy = gym.pokemon;
        const logs: string[] = [
            "▶ 체육관 배틀 시작!",
            `▶ [도전자] ${player.koName || player.name} VS [마스터] ${enemy.koName || enemy.name}`
        ];
        setBattleLog([...logs]);

        runBattleLoop(player, enemy, logs);
    };

    const runBattleLoop = async (player: PokemonData, enemy: PokemonData, logs: string[]) => {
        const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

        const newLogs = [`▶ 체육관장 ${gym?.leaderName || "마스터"}와의 배틀 시작!`];
        setBattleLog(newLogs);

        let myHp = (player.stats?.hp || 100) + (player.level * 2);
        let leaderHp = (enemy.stats?.hp || 100) + (enemy.level * 2);
        const maxMyHp = myHp; // Not used in this snippet, but good to keep for potential HP bar
        const maxLeaderHp = leaderHp; // Not used in this snippet, but good to keep for potential HP bar

        let myBasicCount = 0;
        let leaderBasicCount = 0;

        await wait(1500);

        while (myHp > 0 && leaderHp > 0) {
            // 플레이어 턴 (선공 - 레벨/속도 차이 무시 단순화)
            const mySkillSelection = selectBattleSkill(player.skills as any, myBasicCount);
            const mySkill = mySkillSelection.skill;

            if (mySkillSelection.isBasic) myBasicCount++;
            else myBasicCount = 0;

            const myEff = getEffectiveness([mySkill.type], enemy.types);
            const myDmg = calculateDamage(player.level, player.stats?.attack || 40, enemy.stats?.defense || 40, mySkill.power, myEff);

            setHitEffect("opponent");
            leaderHp -= myDmg;
            newLogs.push(`▶ [나] ${player.koName || player.name}의 [${mySkill.name}]! ${myDmg} 데미지!`);
            if (myEff > 1) newLogs.push("▶ 앗! 효과가 굉장했다!");
            else if (myEff < 1 && myEff > 0) newLogs.push("▶ 효과가 별로인 듯하다...");
            else if (myEff === 0) newLogs.push("▶ 효과가 없는 듯하다...");

            setBattleLog([...newLogs.slice(-7)]);
            await wait(400);
            setHitEffect("none");
            await wait(600);

            if (leaderHp <= 0) {
                newLogs.push(`▶ 관장의 ${enemy.koName || enemy.name} 쓰러짐!`);
                setBattleLog([...newLogs.slice(-7)]);
                break;
            }

            // 관장 턴
            const leaderSkillSelection = selectBattleSkill(enemy.skills as any, leaderBasicCount);
            const leaderSkill = leaderSkillSelection.skill;

            if (leaderSkillSelection.isBasic) leaderBasicCount++;
            else leaderBasicCount = 0;

            const leaderEff = getEffectiveness([leaderSkill.type], player.types);
            const leaderDmg = calculateDamage(enemy.level, enemy.stats?.attack || 40, player.stats?.defense || 40, leaderSkill.power, leaderEff);

            setHitEffect("player");
            myHp -= leaderDmg;
            newLogs.push(`▶ [관장] ${enemy.koName || enemy.name}의 [${leaderSkill.name}]! ${leaderDmg} 데미지!`);
            if (leaderEff > 1) newLogs.push("▶ 앗! 효과가 굉장했다!");
            else if (leaderEff < 1 && leaderEff > 0) newLogs.push("▶ 효과가 별로인 듯하다...");
            else if (leaderEff === 0) newLogs.push("▶ 효과가 없는 듯하다...");

            setBattleLog([...newLogs.slice(-7)]);
            await wait(400);
            setHitEffect("none");
            await wait(600);

            if (myHp <= 0) {
                newLogs.push(`▶ 내 ${player.koName || player.name} 쓰러짐...`);
                setBattleLog([...newLogs.slice(-7)]);
                break;
            }
        }

        const playerWon = myHp > 0;
        setWinner(playerWon ? "player" : "leader");
        setGameState("result");

        if (playerWon) {
            handleVictory(player);
        } else {
            handleDefeat(player);
        }
    };

    // 승리 처리
    const handleVictory = async (player: PokemonData) => {
        const retiredTime = new Date();
        retiredTime.setHours(retiredTime.getHours() + 12);

        setBattleLog(prev => [...prev, "▶ 체육관 마스터를 꺾었습니다!", "▶ 당당하게 체육관을 차지했습니다!"]);
        if (gym?.pokemon?.id) {
            try {
                await updateDoc(doc(db, "pokemon_inventory", gym.pokemon.id), { retiredUntil: retiredTime });
            } catch (e) { console.error("기존 리더 포켓몬 리타이어 처리 실패:", e); }
        }

        // 배틀 로그 기록
        try {
            if (session && session.classId) {
                await addDoc(collection(db, "battle_logs"), {
                    type: 'battle',
                    battleType: 'gym',
                    challengerId: session.studentId,
                    challengerName: session.studentInfo?.name || session.name || "익명 학생",
                    defenderId: gym?.leaderId || "NPC",
                    defenderName: gym?.leaderName || "체육관 마스터",
                    winnerId: session.studentId,
                    winnerName: session.studentInfo?.name || session.name || "익명 학생",
                    loserId: gym?.leaderId || "NPC",
                    loserName: gym?.leaderName || "체육관 마스터",
                    winnerPoke: player.koName || player.name || "비어있음",
                    loserPoke: gym?.pokemon?.koName || gym?.pokemon?.name || "비어있음",
                    createdAt: serverTimestamp(),
                    classId: session.classId
                });

                // 학생 활동 로그 기록
                await addDoc(collection(db, "student_logs"), {
                    studentId: session.studentId,
                    classId: session.classId,
                    type: "battle_gym",
                    title: "체육관 배틀 승리! 👑",
                    description: `${gym?.leaderName || "마스터"}를 꺾고 체육관을 차지했습니다!`,
                    details: {
                        opponentId: gym?.leaderId || "NPC",
                        opponentName: gym?.leaderName || "체육관 마스터",
                        isWin: true,
                        myPoke: player.koName || player.name,
                        oppPoke: gym?.pokemon?.koName || gym?.pokemon?.name
                    },
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error("체육관 배틀 로그 저장 실패:", e);
        }

        await handleOccupy(player);
    };

    // 패배 처리
    const handleDefeat = async (player: PokemonData) => {
        const retiredTime = new Date();
        retiredTime.setHours(retiredTime.getHours() + 12);

        setBattleLog(prev => [...prev, "▶ 전투에서 패배했습니다...", "▶ 패배한 포켓몬이 12시간 동안 휴식합니다."]);
        try {
            await updateDoc(doc(db, "pokemon_inventory", player.id), { retiredUntil: retiredTime });
            if (session && session.classId) {
                await updateDoc(doc(db, "gyms", session.classId), { defenseCount: increment(1) });

                // 배틀 로그 기록
                await addDoc(collection(db, "battle_logs"), {
                    type: 'battle',
                    battleType: 'gym',
                    challengerId: session.studentId,
                    challengerName: session.studentInfo?.name || session.name || "익명 학생",
                    defenderId: gym?.leaderId || "NPC",
                    defenderName: gym?.leaderName || "체육관 마스터",
                    winnerId: gym?.leaderId || "NPC",
                    winnerName: gym?.leaderName || "체육관 마스터",
                    loserId: session.studentId,
                    loserName: session.studentInfo?.name || session.name || "익명 학생",
                    winnerPoke: gym?.pokemon?.koName || gym?.pokemon?.name || "비어있음",
                    loserPoke: player.koName || player.name || "비어있음",
                    createdAt: serverTimestamp(),
                    classId: session.classId
                });

                // 학생 활동 로그 기록
                await addDoc(collection(db, "student_logs"), {
                    studentId: session.studentId,
                    classId: session.classId,
                    type: "battle_gym",
                    title: "체육관 배틀 패배... 💧",
                    description: `${gym?.leaderName || "마스터"}와의 대결에서 패배했습니다.`,
                    details: {
                        opponentId: gym?.leaderId || "NPC",
                        opponentName: gym?.leaderName || "체육관 마스터",
                        isWin: false,
                        myPoke: player.koName || player.name,
                        oppPoke: gym?.pokemon?.koName || gym?.pokemon?.name
                    },
                    createdAt: serverTimestamp()
                });

                // 포켓몬 휴식 시작(리타이어) 로그 기록
                await addDoc(collection(db, "student_logs"), {
                    studentId: session.studentId,
                    classId: session.classId,
                    type: "layoff_start",
                    title: "포켓몬 휴식 시작",
                    description: `패배한 포켓몬(${player.koName || player.name})이 12시간 동안 휴식에 들어갑니다.`,
                    details: {
                        pokemonId: player.id,
                        retiredUntil: retiredTime,
                        reason: "gym_defeat"
                    },
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) { console.error("도전자 포켓몬 리타이어 처리 및 로그 기록 실패:", e); }
    };

    // 체육관 점령 처리
    const handleOccupy = async (player: PokemonData) => {
        if (!session) return;
        try {
            const newGymData = {
                leaderId: session.studentId,
                leaderName: session.studentInfo?.name || session.name || "익명 학생",
                pokemon: player,
                occupiedAt: serverTimestamp(),
                lastRewardAt: serverTimestamp(),
                defenseCount: 0
            };
            await setDoc(doc(db, "gyms", session.classId), newGymData);
            setGym(newGymData as any);
            toast.success("체육관 점령 성공! 새로운 마스터가 되었습니다!");
        } catch (e) {
            console.error("점령 실패:", e);
            toast.error("점령 처리 중 오류 발생");
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                <div className="w-16 h-16 border-4 border-black border-t-white rounded-full animate-spin" />
                <p className="text-lg font-bold pixel-text text-black">데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
            {/* 헤더 */}
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
                        <div className="p-2 bg-yellow-400 border-2 border-black flex items-center justify-center w-12 h-12">
                            <span className="text-black text-2xl">⚡</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black pixel-text uppercase">Gym Stadium</h2>
                            <p className="text-[10px] sm:text-xs text-gray-600 font-bold pixel-text uppercase mt-1">학급 체육관</p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* === 정보 화면 === */}
                {gameState === "info" && (
                    <motion.div key="info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 현재 마스터 카드 */}
                            <div className="pixel-box bg-white overflow-hidden relative border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center">
                                <div className="absolute inset-0 bg-yellow-300 opacity-20 pointer-events-none" />
                                <div className="text-center p-4 relative z-10 w-full border-b-4 border-black bg-yellow-400">
                                    <h3 className="text-xl font-black pixel-text text-black uppercase tracking-widest mt-1">
                                        ⭐ HALL OF FAME ⭐
                                    </h3>
                                </div>

                                <div className="flex flex-col items-center relative z-10 p-6 w-full flex-grow">
                                    {gym?.leaderId ? (
                                        <>
                                            <div className="bg-black text-yellow-400 px-4 py-1 border-2 border-black uppercase pixel-text text-xs mb-4 shadow-[2px_2px_0_0_rgba(250,204,21,1)]">
                                                Gym Leader
                                            </div>
                                            <p className="text-2xl font-black pixel-text mb-6">
                                                {gym.leaderName}
                                            </p>
                                            <div className="relative mb-6">
                                                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white border-4 border-black flex items-center justify-center p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                                    <PokemonImage
                                                        id={gym.pokemon?.pokemonId || 0}
                                                        name={gym.pokemon?.koName || gym.pokemon?.name}
                                                        className="w-full h-full object-contain pixelated hover:scale-110 transition-transform"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xl font-black pixel-text mb-2">
                                                {gym.pokemon?.koName || gym.pokemon?.name}
                                            </p>

                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-[10px] sm:text-xs font-bold bg-yellow-300 border border-black px-2 py-0.5">
                                                    Lv.{gym.pokemon?.level}
                                                </span>
                                                <div className="flex gap-1">
                                                    {gym.pokemon?.types?.map(t => (
                                                        <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white border border-black px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase pixel-text`}>
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 스탯 창 */}
                                            <div className="flex gap-3 mt-2">
                                                <div className="flex flex-col items-center bg-gray-100 border-2 border-black p-2 min-w-[70px]">
                                                    <span className="text-xl">❤️</span>
                                                    <span className="text-lg font-black pixel-text">{gym.pokemon?.stats?.hp || 100}</span>
                                                    <span className="text-[10px] font-bold text-gray-600 pixel-text">HP</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-gray-100 border-2 border-black p-2 min-w-[70px]">
                                                    <span className="text-xl">⚔️</span>
                                                    <span className="text-lg font-black pixel-text">{gym.pokemon?.stats?.attack || 40}</span>
                                                    <span className="text-[10px] font-bold text-gray-600 pixel-text">ATK</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-gray-100 border-2 border-black p-2 min-w-[70px]">
                                                    <span className="text-xl">🛡️</span>
                                                    <span className="text-lg font-black pixel-text">{gym.pokemon?.stats?.defense || 40}</span>
                                                    <span className="text-[10px] font-bold text-gray-600 pixel-text">DEF</span>
                                                </div>
                                            </div>

                                            {/* 점령 및 보상 정보 */}
                                            <div className="mt-4 w-full bg-gray-50 border-2 border-black p-2 sm:p-3 text-center text-xs sm:text-sm font-bold pixel-text text-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                                                <div className="mb-1.5 flex items-center justify-center gap-1.5">
                                                    <span>🚩</span>
                                                    <span>점령 시각:</span>
                                                    <span className="text-black">
                                                        {(() => {
                                                            if (!gym.occupiedAt) return "알 수 없음";
                                                            let d = new Date();
                                                            if (typeof gym.occupiedAt.toDate === 'function') d = gym.occupiedAt.toDate();
                                                            else if (gym.occupiedAt.seconds) d = new Date(gym.occupiedAt.seconds * 1000);
                                                            const pad = (n: number) => n.toString().padStart(2, '0');
                                                            return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-center gap-1.5 text-yellow-600">
                                                    <span>🍬</span>
                                                    <span>다음 보상:</span>
                                                    <span className="text-red-600">
                                                        {(() => {
                                                            if (!gym.lastRewardAt) return "알 수 없음";
                                                            let d = new Date();
                                                            if (typeof gym.lastRewardAt.toDate === 'function') d = gym.lastRewardAt.toDate();
                                                            else if (gym.lastRewardAt.seconds) d = new Date(gym.lastRewardAt.seconds * 1000);
                                                            const nextD = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
                                                            const pad = (n: number) => n.toString().padStart(2, '0');
                                                            return `${nextD.getFullYear()}.${pad(nextD.getMonth() + 1)}.${pad(nextD.getDate())} ${pad(nextD.getHours())}:${pad(nextD.getMinutes())}`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-20 text-center">
                                            <div className="text-6xl mb-6">🏛️</div>
                                            <p className="text-2xl font-black pixel-text mb-4 text-red-500">빈 체육관!</p>
                                            <p className="text-sm font-bold pixel-text text-gray-600">
                                                최초의 포켓몬 마스터가 되어보세요.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 w-full bg-gray-100 border-t-4 border-black relative z-10">
                                    <Button
                                        size="lg"
                                        className="w-full pixel-button font-black text-lg h-14 bg-red-500 hover:bg-red-600 text-white"
                                        onClick={() => {
                                            if (myPokemon.length === 0) {
                                                toast.error("대결 가능한 포켓몬이 없습니다. 도감에서 레벨업을 먼저 해주세요!");
                                                return;
                                            }
                                            setGameState("select");
                                        }}
                                    >
                                        <span className="mr-2 text-xl">⚔️</span>
                                        {gym?.leaderId ? "도전하기" : "체육관 차지하기"}
                                    </Button>
                                </div>
                            </div>

                            {/* 규칙 & 상태 */}
                            <div className="space-y-6">
                                <div className="pixel-box bg-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                    <h3 className="text-lg sm:text-xl font-black pixel-text mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                                        ℹ️ 체육관 규칙
                                    </h3>
                                    <div className="space-y-4 text-xs sm:text-sm pixel-text">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-blue-500 text-white w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 font-bold">1</span>
                                            <p className="leading-tight pt-1">마스터와 배틀하여 승리하면 체육관을 즉시 차지합니다.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="bg-yellow-400 text-black w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 font-bold">2</span>
                                            <p className="leading-tight pt-1">1주일 동안 체육관을 지키면 <span className="text-yellow-600 font-bold bg-yellow-100 px-1 border border-black">캔디 3개</span> 보상 획득!</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="bg-red-500 text-white w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 font-bold">3</span>
                                            <p className="leading-tight pt-1">패배한 포켓몬은 <span className="text-red-600 font-bold bg-red-100 px-1 border border-black">12시간</span> 동안 휴식이 필요합니다.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pixel-box bg-blue-500 text-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-blue-200 font-black pixel-text text-sm">나의 상태</p>
                                            <h3 className="text-lg sm:text-xl font-black pixel-text mt-1">
                                                대결 가능: {myPokemon.length}마리
                                            </h3>
                                        </div>
                                        <div className="text-4xl bg-blue-600 p-2 border-2 border-black">🎒</div>
                                    </div>
                                    <Button
                                        className="w-full pixel-button bg-white text-blue-600 hover:bg-gray-100"
                                        onClick={() => router.push("/student/pokedex")}
                                    >
                                        도감으로 이동
                                    </Button>
                                </div>

                                {/* 자기 자신이 마스터인 경우 알림 */}
                                {gym?.leaderId === session?.studentId && (
                                    <div className="pixel-box bg-yellow-400 text-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-4 border-black animate-pulse">
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl">👑</div>
                                            <div>
                                                <p className="font-black pixel-text text-lg sm:text-xl">당신이 방어 중입니다!</p>
                                                <p className="text-sm font-bold mt-1 text-gray-800 pixel-text">자랑스러운 포켓몬 마스터 💪</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 포켓몬 선택 화면 === */}
                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div className="flex items-center justify-between pixel-box bg-white p-4 mb-6">
                            <h3 className="text-sm sm:text-base font-bold pixel-text flex items-center gap-2">
                                🎒 {gym?.leaderId ? "도전 포켓몬 선택" : "차지할 포켓몬 선택"}
                            </h3>
                            <Button onClick={() => setGameState("info")} className="pixel-button bg-gray-300 text-black hidden sm:flex">
                                도망치기
                            </Button>
                        </div>

                        {myPokemon.length === 0 ? (
                            <div className="pixel-box bg-white p-16 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                <div className="text-5xl mb-6">😢</div>
                                <p className="text-xl font-black pixel-text mb-4 text-red-500">출전 가능한 포켓몬이 없습니다.</p>
                                <p className="text-sm font-bold pixel-text text-gray-600 mb-6">
                                    리타이어 중이거나 아직 포켓몬이 없습니다.
                                </p>
                                <Button className="pixel-button bg-blue-500 text-white" onClick={() => router.push("/student/pokedex")}>
                                    도감으로 이동
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {myPokemon.map(poke => (
                                    <div
                                        key={poke.id}
                                        className="pixel-box bg-white p-3 sm:p-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all relative group flex flex-col justify-between"
                                        onClick={() => startChallenge(poke)}
                                    >
                                        <div>
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 border-2 border-black flex items-center justify-center p-1 sm:p-2 relative mx-auto mb-3">
                                                <PokemonImage
                                                    id={poke.pokemonId}
                                                    name={poke.koName || poke.name}
                                                    className="w-full h-full object-contain pixelated"
                                                />
                                            </div>
                                            <h4 className="font-bold pixel-text text-sm sm:text-base text-center truncate mb-1" title={poke.koName || poke.name}>
                                                {poke.koName || poke.name}
                                            </h4>
                                            <div className="flex justify-center flex-wrap gap-1 mb-3">
                                                <span className="text-[10px] font-bold bg-yellow-300 border border-black px-1 py-0.5 whitespace-nowrap">Lv.{poke.level}</span>
                                                {poke.types.map((t) => (
                                                    <span key={t} className="text-[8px] sm:text-[10px] bg-gray-200 border border-black px-1 py-0.5 uppercase pixel-text">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-black/10 hidden group-hover:flex items-center justify-center">
                                            <span className="bg-red-500 text-white pixel-text text-sm sm:text-base px-3 py-1 border-2 border-black animate-pulse">{gym?.leaderId ? "출전!" : "차지하기!"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button onClick={() => setGameState("info")} className="pixel-button bg-gray-300 text-black mt-6 w-full sm:hidden">
                            도망치기
                        </Button>
                    </motion.div>
                )}

                {/* === 배틀 화면 === */}
                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-4 sm:py-8 space-y-8">
                        {/* 배틀 아레나 존 */}
                        <div className="w-full max-w-4xl relative pixel-box bg-white/50 border-4 border-black p-4 sm:p-8 overflow-hidden h-64 md:h-80 flex items-center justify-between shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                            {/* 배경 장식 */}
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-blue-200 border-t-4 border-black z-0" />

                            {/* 도전자 영역 (왼쪽 아래) */}
                            <motion.div
                                className="z-10 absolute bottom-4 sm:bottom-8 left-4 sm:left-12 flex flex-col items-center"
                                animate={{ x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <div className="mb-2 bg-white border-2 border-black px-3 py-1 flex items-center gap-2 drop-shadow-sm">
                                    <span className="font-bold pixel-text text-[10px] md:text-sm text-blue-600">도전자</span>
                                </div>
                                <motion.div
                                    animate={hitEffect === "player" ? {
                                        x: [-10, 10, -10, 10, 0],
                                        filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                                    } : {}}
                                    transition={{ duration: 0.4 }}
                                    className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]"
                                >
                                    <PokemonImage
                                        id={selectedMyPoke?.pokemonId || 0}
                                        name={selectedMyPoke?.koName || selectedMyPoke?.name}
                                        className="w-full h-full object-contain pixelated [transform:scaleX(-1)]"
                                    />
                                </motion.div>
                                <div className="mt-2 text-center drop-shadow-sm">
                                    <p className="font-bold pixel-text text-[10px] sm:text-sm md:text-base text-black bg-white px-3 py-1 border-2 border-black truncate max-w-[120px] md:max-w-none">
                                        {selectedMyPoke?.koName || selectedMyPoke?.name}
                                    </p>
                                </div>
                            </motion.div>

                            {/* 체육관 마스터 영역 (오른쪽 위) */}
                            <motion.div
                                className="z-10 absolute top-4 sm:top-8 right-4 sm:right-12 flex flex-col items-center"
                                animate={{ x: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            >
                                <div className="mb-2 bg-white border-2 border-black px-3 py-1 flex items-center gap-2 drop-shadow-sm flex-row-reverse">
                                    <span className="font-bold pixel-text text-[10px] md:text-sm text-red-600 truncate max-w-[100px]">
                                        {gym?.leaderName || "마스터"}
                                    </span>
                                </div>
                                <motion.div
                                    animate={hitEffect === "opponent" ? {
                                        x: [-10, 10, -10, 10, 0],
                                        filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                                    } : {}}
                                    transition={{ duration: 0.4 }}
                                    className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]"
                                >
                                    <PokemonImage
                                        id={gym?.pokemon?.pokemonId || 0}
                                        name={gym?.pokemon?.koName || gym?.pokemon?.name}
                                        className="w-full h-full object-contain pixelated"
                                    />
                                </motion.div>
                                <div className="mt-2 text-center drop-shadow-sm flex flex-col items-center">
                                    <p className="font-bold pixel-text text-[10px] sm:text-sm md:text-base text-black bg-white px-3 py-1 border-2 border-black truncate max-w-[120px] md:max-w-none">
                                        {gym?.pokemon?.koName || gym?.pokemon?.name || "???"}
                                    </p>
                                    <span className="text-[10px] font-black pixel-text bg-red-500 text-white px-2 py-0.5 mt-1 border border-black display-block max-w-[100px] truncate" title={gym?.leaderName || "마스터"}>
                                        마스터: {gym?.leaderName || "???"}
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        {/* 배틀 로그 */}
                        <div className="w-full max-w-4xl pixel-box bg-white p-4 sm:p-6 relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200" />
                            <div className="space-y-3 h-48 sm:h-56 overflow-y-auto pr-2 custom-scrollbar mt-2 flex flex-col justify-end pb-2">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`text-xs sm:text-sm md:text-base font-bold pixel-text leading-relaxed ${log.includes("공격") ? "text-green-600" : log.includes("반격") ? "text-red-600" : log.includes("마스터") || log.includes("점령") ? "text-blue-600" : "text-black"}`}
                                    >
                                        {log}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 결과 화면 === */}
                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-6 sm:py-10 px-2 sm:px-4 w-full max-w-4xl mx-auto space-y-6">
                        <div className="relative mb-6 sm:mb-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                className={`text-4xl sm:text-6xl md:text-8xl font-black pixel-text drop-shadow-[2px_2px_0_rgba(0,0,0,1)] sm:drop-shadow-[4px_4px_0_rgba(0,0,0,1)] ${winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`}
                            >
                                {winner === 'player' ? 'CHAMPION!' : 'DEFEATED'}
                            </motion.div>
                        </div>

                        <div className="pixel-box bg-white p-4 sm:p-6 text-center w-full">
                            <p className="text-sm sm:text-lg md:text-xl font-bold pixel-text leading-tight">
                                {winner === 'player'
                                    ? <span className="text-blue-600 text-lg">🎉 축하합니다! 새로운 체육관 마스터가 되었습니다! 🎉</span>
                                    : <span className="text-red-500 text-lg">아쉽습니다. 포켓몬을 더 훈련시켜서 다시 도전하세요!</span>}
                            </p>
                        </div>

                        <div className="pixel-box bg-white p-6 flex flex-col items-center relative overflow-hidden w-full sm:w-80">
                            {winner === 'player' && <div className="absolute inset-0 bg-yellow-300 opacity-20 animate-pulse" />}
                            <h5 className="text-[10px] sm:text-xs font-black pixel-text text-gray-800 mb-4 bg-gray-200 px-3 py-1 border-2 border-black inline-block z-10 w-fit">
                                {winner === 'player' ? '👑 새로운 마스터 👑' : '👑 무패의 마스터 👑'}
                            </h5>
                            <div className="w-32 h-32 flex items-center justify-center p-2 mb-4 bg-gray-50 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] z-10">
                                <img
                                    src={winner === 'player' ? selectedMyPoke?.image : gym?.pokemon?.image}
                                    className="w-full h-full object-contain pixelated hover:scale-110 transition-transform"
                                    alt="winner"
                                />
                            </div>
                            <span className="font-black text-xl pixel-text text-center z-10 w-full px-2">
                                {winner === 'player' ? (selectedMyPoke?.koName || selectedMyPoke?.name) : (gym?.pokemon?.koName || gym?.pokemon?.name)}
                            </span>
                        </div>

                        <div className="mt-8 sm:mt-12 w-full max-w-sm">
                            <Button
                                size="lg"
                                className="w-full pixel-button bg-blue-500 text-white hover:bg-blue-600 h-14 text-lg border-2 border-black"
                                onClick={() => {
                                    setGameState("info");
                                    if (session) fetchData(session.studentId, session.classId);
                                }}
                            >
                                체육관으로 돌아가기
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
