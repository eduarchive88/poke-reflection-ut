"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc,
    setDoc, updateDoc, serverTimestamp, increment,
    writeBatch
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, Swords, Shield, Heart, Zap, User, Crown, Info, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PokemonImage } from "@/components/PokemonImage";

// 상성 데이터
const TYPE_CHART: Record<string, Record<string, number>> = {
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, ground: 2, rock: 2, grass: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
    poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
    ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
    flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
    rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
    ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
    ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
    dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
    fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
    fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 }
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
                setGym(currentGymData);
                await checkWeeklyReward(studentId, classId, currentGymData);
            } else {
                // 체육관이 없으면 빈 체육관 생성
                const initialGym: GymData = {
                    leaderId: null,
                    leaderName: null,
                    pokemon: null,
                    lastRewardAt: serverTimestamp(),
                    occupiedAt: serverTimestamp()
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
            setTimeout(() => setGameState("result"), 1500);
            return;
        }

        const enemy = gym.pokemon;
        const logs: string[] = [
            "⚔️ 체육관 배틀 시작!",
            `[도전자] ${player.koName || player.name} VS [마스터] ${enemy.koName || enemy.name}`
        ];
        setBattleLog([...logs]);

        const pStats = player.stats || { hp: 100, attack: 40, defense: 40 };
        const eStats = enemy.stats || { hp: 100, attack: 40, defense: 40 };

        let pHp = pStats.hp + (player.level * 2);
        let eHp = eStats.hp + (enemy.level * 2);

        const pEff = getEffectiveness(player.types, enemy.types);
        const eEff = getEffectiveness(enemy.types, player.types);

        let turn = 1;

        const processTurn = () => {
            if (pHp <= 0 || eHp <= 0) {
                finishBattle(pHp > 0, player, enemy);
                return;
            }

            if (turn % 2 !== 0) {
                const damage = Math.max(5, Math.floor(((player.level * 2 + pStats.attack * pEff) / (eStats.defense * 0.5)) * (Math.random() * 0.4 + 0.8)));
                eHp -= damage;
                logs.push(`💥 ${player.koName || player.name}의 공격! ${damage} 데미지!`);
                if (pEff > 1) logs.push("✨ 효과가 굉장했다!");
            } else {
                const damage = Math.max(5, Math.floor(((enemy.level * 2 + eStats.attack * eEff) / (pStats.defense * 0.5)) * (Math.random() * 0.4 + 0.8)));
                pHp -= damage;
                logs.push(`🔥 ${enemy.koName || enemy.name}의 반격! ${damage} 데미지!`);
                if (eEff > 1) logs.push("✨ 효과가 굉장했다!");
            }

            setBattleLog([...logs.slice(-6)]);
            turn++;
            setTimeout(processTurn, 800);
        };

        setTimeout(processTurn, 1500);
    };

    // 배틀 종료 처리
    const finishBattle = async (isWin: boolean, player: PokemonData, enemy: PokemonData) => {
        const retiredTime = new Date();
        retiredTime.setHours(retiredTime.getHours() + 12);

        if (isWin) {
            setWinner("player");
            setBattleLog(prev => [...prev, "🏆 체육관 마스터를 꺾었습니다!", "👑 당신이 새로운 마스터입니다!"]);
            if (gym?.pokemon?.id) {
                try {
                    await updateDoc(doc(db, "pokemon_inventory", gym.pokemon.id), { retiredUntil: retiredTime });
                } catch (e) { console.error("기존 리더 포켓몬 리타이어 처리 실패:", e); }
            }
            await handleOccupy(player);
        } else {
            setWinner("leader");
            setBattleLog(prev => [...prev, "😢 전투에서 패배했습니다...", "💤 포켓몬이 12시간 동안 휴식합니다."]);
            try {
                await updateDoc(doc(db, "pokemon_inventory", player.id), { retiredUntil: retiredTime });
            } catch (e) { console.error("도전자 포켓몬 리타이어 처리 실패:", e); }
        }
        setTimeout(() => setGameState("result"), 1000);
    };

    // 체육관 점령 처리
    const handleOccupy = async (player: PokemonData) => {
        if (!session) return;
        try {
            const newGymData = {
                leaderId: session.studentId,
                leaderName: session.name || session.studentInfo?.name || "익명 학생",
                pokemon: player,
                occupiedAt: serverTimestamp(),
                lastRewardAt: serverTimestamp()
            };
            await setDoc(doc(db, "gyms", session.classId), newGymData);
            setGym(newGymData as any);
            toast.success("🎉 체육관을 점령했습니다! 포켓몬 마스터가 되신 것을 축하합니다!");
        } catch (e) {
            console.error("점령 실패:", e);
            toast.error("점령 처리 중 오류 발생");
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full"
                />
                <p className="text-lg font-bold text-yellow-600">체육관 데이터 로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* 헤더 */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/student")}
                    className="rounded-full hover:bg-yellow-500/20"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg">
                        <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">⚡ 포켓몬 체육관</h2>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Gym Stadium</p>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* === 정보 화면 === */}
                {gameState === "info" && (
                    <motion.div key="info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 현재 마스터 카드 */}
                            <Card className="rounded-3xl border-4 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)] overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-amber-500/10" />
                                <CardHeader className="text-center pb-2 relative z-10">
                                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white mx-auto px-5 py-1.5 rounded-full text-xs font-black tracking-widest mb-3 shadow-lg">
                                        🏆 HALL OF FAME
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        <Crown className="h-12 w-12 text-yellow-500 drop-shadow-lg animate-pulse" />
                                    </div>
                                    <CardTitle className="text-2xl font-black text-yellow-800 dark:text-yellow-200">
                                        POKEMON MASTER
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center relative z-10 pb-4">
                                    {gym?.leaderId ? (
                                        <>
                                            <p className="text-3xl font-black text-primary mb-4">{gym.leaderName}</p>
                                            <div className="relative mb-4">
                                                <motion.div
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 3 }}
                                                    className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl"
                                                />
                                                <PokemonImage
                                                    id={gym.pokemon?.pokemonId || 0}
                                                    name={gym.pokemon?.koName || gym.pokemon?.name}
                                                    className="w-44 h-44 relative z-10"
                                                />
                                            </div>
                                            <p className="text-lg font-black capitalize mb-1">
                                                {gym.pokemon?.koName || gym.pokemon?.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground font-bold mb-4">Lv.{gym.pokemon?.level}</p>

                                            {/* 타입 뱃지 */}
                                            <div className="flex gap-2 mb-4">
                                                {gym.pokemon?.types?.map(t => (
                                                    <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* 스탯 */}
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center bg-red-500/10 p-3 rounded-2xl min-w-[70px]">
                                                    <Heart className="h-4 w-4 text-red-500 mb-1" />
                                                    <span className="text-base font-black">{gym.pokemon?.stats?.hp || 100}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground">HP</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-blue-500/10 p-3 rounded-2xl min-w-[70px]">
                                                    <Zap className="h-4 w-4 text-blue-500 mb-1" />
                                                    <span className="text-base font-black">{gym.pokemon?.stats?.attack || 40}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground">ATK</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-green-500/10 p-3 rounded-2xl min-w-[70px]">
                                                    <Shield className="h-4 w-4 text-green-500 mb-1" />
                                                    <span className="text-base font-black">{gym.pokemon?.stats?.defense || 40}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground">DEF</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-16 text-center">
                                            <div className="text-6xl mb-4">🏟️</div>
                                            <p className="text-xl font-black mb-2">빈 체육관!</p>
                                            <p className="text-sm text-muted-foreground font-bold">
                                                최초의 포켓몬 마스터가 되어보세요!
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-6 pt-2">
                                    <Button
                                        size="lg"
                                        className="w-full rounded-2xl font-black text-lg h-14 shadow-lg
                                            bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600
                                            text-white border-none"
                                        onClick={() => {
                                            if (myPokemon.length === 0) {
                                                toast.error("대결 가능한 포켓몬이 없습니다. 도감에서 레벨업을 먼저 해주세요!");
                                                return;
                                            }
                                            setGameState("select");
                                        }}
                                    >
                                        <Swords className="h-6 w-6 mr-2" />
                                        {gym?.leaderId ? "도전하기" : "체육관 차지하기"}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* 규칙 & 상태 */}
                            <div className="space-y-4">
                                <Card className="rounded-3xl p-5 bg-blue-500/5 border-2 border-blue-500/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Info className="h-5 w-5 text-blue-500" /> 체육관 규칙
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                                            <p>마스터와 배틀하여 승리하면 체육관을 차지합니다.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                                            <p>1주일 동안 지키면 <span className="text-amber-600 font-bold">캔디 3개</span> 보상!</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                                            <p>패배한 포켓몬은 <span className="text-red-500 font-bold">12시간</span> 휴식이 필요합니다.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-blue-200 font-bold text-sm">나의 상태</p>
                                            <h3 className="text-xl font-black mt-1">
                                                대결 가능: {myPokemon.length}마리
                                            </h3>
                                        </div>
                                        <div className="text-4xl">🎒</div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        className="mt-4 w-full rounded-2xl font-bold"
                                        onClick={() => router.push("/student/pokedex")}
                                    >
                                        도감에서 레벨업 하기
                                    </Button>
                                </Card>

                                {/* 자기 자신이 마스터인 경우 알림 */}
                                {gym?.leaderId === session?.studentId && (
                                    <Card className="rounded-3xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-6">
                                        <div className="flex items-center gap-3">
                                            <Crown className="h-8 w-8" />
                                            <div>
                                                <p className="font-black text-lg">당신이 현재 마스터입니다!</p>
                                                <p className="text-sm text-yellow-100">체육관을 잘 지키세요 💪</p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 포켓몬 선택 화면 === */}
                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div className="mb-6 flex items-center gap-4">
                            <Button variant="outline" onClick={() => setGameState("info")} className="rounded-2xl">
                                ← 뒤로가기
                            </Button>
                            <h3 className="text-xl font-black">⚔️ 출전 포켓몬을 선택하세요!</h3>
                        </div>
                        {myPokemon.length === 0 ? (
                            <Card className="p-16 text-center border-dashed rounded-3xl border-2">
                                <div className="text-5xl mb-4">😢</div>
                                <p className="text-lg font-bold text-muted-foreground">출전 가능한 포켓몬이 없습니다.</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    리타이어 중이거나 아직 포켓몬이 없습니다.
                                </p>
                                <Button className="mt-6 rounded-2xl" onClick={() => router.push("/student/pokedex")}>
                                    도감으로 이동
                                </Button>
                            </Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {myPokemon.map(poke => (
                                    <motion.div key={poke.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Card
                                            className="rounded-2xl cursor-pointer overflow-hidden border-2 hover:border-yellow-400 hover:shadow-lg transition-all"
                                            onClick={() => startChallenge(poke)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <PokemonImage
                                                    id={poke.pokemonId}
                                                    name={poke.koName || poke.name}
                                                    className="w-16 h-16 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-base truncate">{poke.koName || poke.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-bold text-muted-foreground">Lv.{poke.level}</span>
                                                        <div className="flex gap-1">
                                                            {poke.types.map(t => (
                                                                <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button size="sm" className="rounded-2xl px-4 font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-white shrink-0">
                                                    출전!
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* === 배틀 화면 === */}
                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 space-y-8">
                        <div className="flex justify-between items-center w-full max-w-3xl px-4">
                            {/* 도전자 */}
                            <div className="flex flex-col items-center gap-3">
                                <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-full">도전자</span>
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <PokemonImage
                                        id={selectedMyPoke?.pokemonId || 0}
                                        name={selectedMyPoke?.koName || selectedMyPoke?.name}
                                        className="w-36 h-36 md:w-48 md:h-48"
                                    />
                                </motion.div>
                                <p className="text-lg font-black">{selectedMyPoke?.koName || selectedMyPoke?.name}</p>
                            </div>

                            <div className="text-4xl font-black text-muted-foreground/30 animate-pulse">VS</div>

                            {/* 마스터 */}
                            <div className="flex flex-col items-center gap-3">
                                <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">마스터</span>
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8 }}
                                >
                                    <PokemonImage
                                        id={gym?.pokemon?.pokemonId || 0}
                                        name={gym?.pokemon?.koName || gym?.pokemon?.name}
                                        className="w-36 h-36 md:w-48 md:h-48"
                                    />
                                </motion.div>
                                <p className="text-lg font-black">{gym?.pokemon?.koName || gym?.pokemon?.name || "???"}</p>
                            </div>
                        </div>

                        {/* 배틀 로그 */}
                        <Card className="w-full max-w-2xl bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 font-mono text-sm min-h-[160px]">
                            <div className="space-y-2">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={`${i}-${log}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`${log.includes("공격") ? "text-green-400" : log.includes("반격") ? "text-red-400" : log.includes("마스터") || log.includes("CHAMPION") ? "text-yellow-400 font-bold" : "text-slate-300"}`}
                                    >
                                        {`> ${log}`}
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* === 결과 화면 === */}
                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-8 text-center space-y-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className={`text-6xl font-black italic ${winner === 'player' ? 'text-yellow-500' : 'text-slate-400'}`}
                        >
                            {winner === 'player' ? '🏆 CHAMPION!' : '😢 DEFEATED'}
                        </motion.div>
                        <p className="text-lg font-bold text-muted-foreground">
                            {winner === 'player' ? '축하합니다! 새로운 체육관 마스터!' : '아쉽습니다. 다음에 다시 도전하세요!'}
                        </p>

                        <Card className="p-8 rounded-3xl bg-secondary/10 border-2 relative overflow-hidden">
                            {winner === 'player' && (
                                <motion.div
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-amber-500/20"
                                />
                            )}
                            <PokemonImage
                                id={winner === 'player' ? (selectedMyPoke?.pokemonId || 0) : (gym?.pokemon?.pokemonId || 0)}
                                name={winner === 'player' ? (selectedMyPoke?.koName || selectedMyPoke?.name) : (gym?.pokemon?.koName || gym?.pokemon?.name)}
                                className="w-48 h-48 relative z-10"
                            />
                        </Card>

                        <Button
                            size="lg"
                            className="rounded-2xl h-14 px-10 font-black text-lg bg-gradient-to-r from-yellow-400 to-amber-500 text-white"
                            onClick={() => {
                                setGameState("info");
                                if (session) fetchData(session.studentId, session.classId);
                            }}
                        >
                            체육관으로 돌아가기
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
