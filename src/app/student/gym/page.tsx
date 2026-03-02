"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc,
    setDoc, updateDoc, serverTimestamp, increment,
    limit, writeBatch
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, Swords, Shield, Heart, Zap, RefreshCcw, User, Crown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 상성 데이터 (lib/stadium 등의 로직과 동기화 필요 시 유틸리티화 권장)
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
    fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
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

interface PokemonData {
    id: string;
    studentId: string;
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

    const fetchData = async (studentId: string, classId: string) => {
        setLoading(true);
        try {
            // 1. 체육관 정보 가져오기
            const gymDoc = await getDoc(doc(db, "gyms", classId));
            if (gymDoc.exists()) {
                setGym(gymDoc.data() as GymData);
                // 주간 보상 체크
                checkWeeklyReward(studentId, classId, gymDoc.data() as GymData);
            } else {
                // 체육관이 없으면 초기화
                const initialGym: GymData = {
                    leaderId: null,
                    leaderName: null,
                    pokemon: null,
                    lastRewardAt: serverTimestamp(),
                    occupiedAt: serverTimestamp()
                };
                await setDoc(doc(db, "gyms", classId), initialGym);
                setGym(initialGym);
            }

            // 2. 내 포켓몬 (리타이어 안 된 것만)
            const now = new Date();
            const myQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const mySnap = await getDocs(myQ);
            const list: PokemonData[] = [];
            mySnap.forEach(doc => {
                const data = doc.data();
                const retiredUntil = data.retiredUntil?.toDate();
                if (!retiredUntil || retiredUntil < now) {
                    list.push({ id: doc.id, ...data } as PokemonData);
                }
            });
            setMyPokemon(list);
        } catch (error) {
            console.error(error);
            toast.error("데이터 동기화 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    const checkWeeklyReward = async (studentId: string, classId: string, currentGym: GymData) => {
        if (currentGym.leaderId !== studentId) return;

        const lastReward = currentGym.lastRewardAt?.toDate() || new Date(0);
        const now = new Date();
        const diffDays = (now.getTime() - lastReward.getTime()) / (1000 * 3600 * 24);

        if (diffDays >= 7) {
            try {
                const batch = writeBatch(db);
                // 1. 캔디 지급
                batch.update(doc(db, "students", studentId), {
                    candies: increment(3)
                });
                // 2. 보상 시간 업데이트
                batch.update(doc(db, "gyms", classId), {
                    lastRewardAt: serverTimestamp()
                });
                await batch.commit();
                toast.success("체육관 수령 보상! 캔디 3개를 획득했습니다. 🍬");
            } catch (e) {
                console.error("보상 지급 실패:", e);
            }
        }
    };

    const startChallenge = (poke: PokemonData) => {
        setSelectedMyPoke(poke);
        setGameState("battle");
        runBattle(poke);
    };

    const runBattle = async (player: PokemonData) => {
        if (!gym || !gym.pokemon) {
            // 즉시 점령
            handleOccupy(player);
            return;
        }

        const enemy = gym.pokemon;
        setBattleLog(["체육관 배틀 시작!", `[도전자] ${player.koName || player.name} VS [마스터] ${enemy.koName || enemy.name}`]);

        // 스탯 추출 (기본값 설정)
        const pStats = player.stats || { hp: 100, attack: 40, defense: 40 };
        const eStats = enemy.stats || { hp: 100, attack: 40, defense: 40 };

        let pHp = pStats.hp + (player.level * 2);
        let eHp = eStats.hp + (enemy.level * 2);

        const pEff = getEffectiveness(player.types, enemy.types);
        const eEff = getEffectiveness(enemy.types, player.types);

        let turn = 1;
        const currentLogs = ["배틀 시작!"];

        const processTurn = () => {
            if (pHp <= 0 || eHp <= 0) {
                finishBattle(pHp > 0, player, enemy);
                return;
            }

            if (turn % 2 !== 0) {
                // 도전자 공격
                const damage = Math.max(5, Math.floor(((player.level * 2 + pStats.attack * pEff) / (eStats.defense * 0.5)) * (Math.random() * 0.4 + 0.8)));
                eHp -= damage;
                currentLogs.push(`${player.koName || player.name}의 공격! ${damage} 데미지!`);
                if (pEff > 1) currentLogs.push("효과가 굉장했다!");
            } else {
                // 마스터 공격
                const damage = Math.max(5, Math.floor(((enemy.level * 2 + eStats.attack * eEff) / (pStats.defense * 0.5)) * (Math.random() * 0.4 + 0.8)));
                pHp -= damage;
                currentLogs.push(`${enemy.koName || enemy.name}의 반격! ${damage} 데미지!`);
                if (eEff > 1) currentLogs.push("효과가 굉장했다!");
            }

            setBattleLog([...currentLogs]);
            turn++;
            setTimeout(processTurn, 800);
        };

        processTurn();
    };

    const finishBattle = async (isWin: boolean, player: PokemonData, enemy: PokemonData) => {
        const retiredTime = new Date();
        retiredTime.setHours(retiredTime.getHours() + 12);

        if (isWin) {
            setWinner("player");
            setBattleLog(prev => [...prev, "체육관 마스터를 꺾었습니다!", "당신이 새로운 마스터입니다!"]);

            // 승리했을 때: 기존 마스터의 포켓몬을 리타이어 처리
            if (gym?.pokemon?.id) {
                try {
                    await updateDoc(doc(db, "pokemon_inventory", gym.pokemon.id), {
                        retiredUntil: retiredTime
                    });
                } catch (e) {
                    console.error("기존 리더 포켓몬 리타이어 처리 실패:", e);
                }
            }
            handleOccupy(player);
        } else {
            setWinner("leader");
            setBattleLog(prev => [...prev, "전투에서 패배했습니다...", "포켓몬이 지쳐 12시간 동안 휴식이 필요합니다."]);
            // 패배했을 때: 도전자 포켓몬 리타이어 처리
            try {
                await updateDoc(doc(db, "pokemon_inventory", player.id), {
                    retiredUntil: retiredTime
                });
            } catch (e) {
                console.error("도전자 포켓몬 리타이어 처리 실패:", e);
            }
        }
        setTimeout(() => setGameState("result"), 1000);
    };

    const handleOccupy = async (player: PokemonData) => {
        try {
            const newGymData = {
                leaderId: session.studentId,
                leaderName: session.studentInfo.name,
                pokemon: player,
                occupiedAt: serverTimestamp(),
                lastRewardAt: serverTimestamp()
            };
            await updateDoc(doc(db, "gyms", session.classId), newGymData);
            setGym(newGymData as any);
            toast.success("체육관을 점령했습니다! '포켓몬 마스터'가 되신 것을 축하합니다!");
        } catch (e) {
            console.error("점령 실패:", e);
            toast.error("점령 처리 중 오류 발생");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-[60vh]">로딩 중...</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
                <h2 className="text-4xl font-black tracking-tighter text-primary flex items-center gap-3 italic">
                    <Trophy className="h-10 w-10 text-yellow-400 drop-shadow-md" />
                    GYM STADIUM
                </h2>
                <p className="text-muted-foreground font-medium">체육관을 점령하여 학급 최고의 마스터가 되어보세요!</p>
            </div>

            <AnimatePresence mode="wait">
                {gameState === "info" && (
                    <motion.div key="info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-8 md:grid-cols-2">
                            {/* 현재 마스터 정보 (영광스러운 UI) */}
                            <Card className="rounded-[4rem] border-8 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.3)] overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-amber-500/20 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                <CardHeader className="text-center pb-2 relative z-10">
                                    <div className="bg-yellow-400 text-yellow-900 mx-auto px-6 py-1 rounded-full text-xs font-black tracking-widest mb-4 inline-block shadow-lg">
                                        HALL OF FAME
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        <Crown className="h-16 w-16 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse" />
                                    </div>
                                    <CardTitle className="text-3xl font-black text-yellow-900 dark:text-yellow-100">
                                        POKEMON MASTER
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center relative z-10">
                                    {gym?.leaderId ? (
                                        <>
                                            <div className="text-center space-y-1 mb-6">
                                                <p className="text-5xl font-black text-primary tracking-tight drop-shadow-sm">{gym.leaderName}</p>
                                                <div className="h-1 w-20 bg-yellow-400 mx-auto rounded-full mt-2"></div>
                                            </div>
                                            <div className="relative mb-6">
                                                <motion.div
                                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                                    transition={{ repeat: Infinity, duration: 4 }}
                                                    className="absolute inset-0 bg-yellow-400/30 rounded-full blur-3xl"
                                                ></motion.div>
                                                <img src={gym.pokemon?.image} className="w-56 h-56 object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]" alt="master-poke" />
                                            </div>
                                            <p className="text-xl font-black text-muted-foreground capitalize">{gym.pokemon?.koName || gym.pokemon?.name} <span className="text-sm">Lv.{gym.pokemon?.level}</span></p>

                                            <div className="flex gap-6 mt-8">
                                                <div className="flex flex-col items-center bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm min-w-[90px]">
                                                    <Heart className="h-5 w-5 text-red-500 mb-1" />
                                                    <span className="text-lg font-black">{gym.pokemon?.stats?.hp || 100}</span>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">HP</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm min-w-[90px]">
                                                    <Zap className="h-5 w-5 text-blue-500 mb-1" />
                                                    <span className="text-lg font-black">{gym.pokemon?.stats?.attack || 40}</span>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">ATK</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm min-w-[90px]">
                                                    <Shield className="h-5 w-5 text-green-500 mb-1" />
                                                    <span className="text-lg font-black">{gym.pokemon?.stats?.defense || 40}</span>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">DEF</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-24 text-center text-muted-foreground/60 italic font-bold">
                                            <p className="text-2xl mb-2">기록된 마스터가 없습니다.</p>
                                            <p>최초의 포켓몬 마스터가 되어 이름을 남기세요!</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-center p-10 mt-4">
                                    <Button size="lg" className="rounded-full w-full max-w-sm font-black text-xl gap-3 h-16 shadow-xl hover:scale-105 transition-transform bg-yellow-500 hover:bg-yellow-600 border-none text-yellow-950" onClick={() => setGameState("select")}>
                                        <Swords className="h-7 w-7" /> 도 전자 도 전 !
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* 체육관 규칙 및 보상 */}
                            <div className="space-y-6">
                                <Card className="rounded-[2.5rem] p-6 bg-secondary/20 border-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Info className="h-5 w-5 text-blue-500" /> 체육관 규칙
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm font-medium">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</div>
                                            <p>체육관 마스터와 배틀하여 승리하면 그 자리를 차지할 수 있습니다.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</div>
                                            <p>체육관을 1주일 동안 지키면 매주 <span className="text-amber-600 font-bold">캔디 3개</span>가 지급됩니다.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</div>
                                            <p>배틀에서 패배한 포켓몬은 <span className="text-red-500 font-bold">12시간 동안</span> 휴식이 필요합니다.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-blue-100 font-bold">나의 상태</p>
                                            <h3 className="text-2xl font-black mt-1">대결 가능 포켓몬: {myPokemon.length}마리</h3>
                                        </div>
                                        <User className="h-12 w-12 text-blue-200/50" />
                                    </div>
                                    <Button variant="secondary" className="mt-6 w-full rounded-full font-bold" onClick={() => router.push("/student/pokedex")}>
                                        도감에서 레벨업 하기
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}

                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div className="mb-6 flex items-center gap-4">
                            <Button variant="ghost" onClick={() => setGameState("info")} className="rounded-full">뒤로가기</Button>
                            <h3 className="text-2xl font-black">출전 포켓몬 선택</h3>
                        </div>
                        {myPokemon.length === 0 ? (
                            <Card className="p-20 text-center border-dashed rounded-[3rem]">
                                <p className="text-muted-foreground font-bold">출전 가능한 포켓몬이 없습니다.</p>
                                <p className="text-xs text-muted-foreground mt-2">(리타이어 상태이거나 아직 포켓몬이 없습니다.)</p>
                            </Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {myPokemon.map(poke => (
                                    <Card
                                        key={poke.id}
                                        className="rounded-[2rem] hover:ring-4 ring-primary/30 transition-all cursor-pointer overflow-hidden border-2"
                                        onClick={() => startChallenge(poke)}
                                    >
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <img src={poke.image} className="w-16 h-16 object-contain" alt={poke.name} />
                                            <div>
                                                <p className="font-black text-lg capitalize">{poke.koName || poke.name}</p>
                                                <p className="text-xs font-bold text-muted-foreground">Lv.{poke.level} | {poke.types.join(", ")}</p>
                                            </div>
                                            <Button size="sm" className="ml-auto rounded-full px-4 font-bold">출전</Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10 space-y-12">
                        <div className="flex justify-between items-center w-full max-w-4xl px-4">
                            <div className="flex flex-col items-center gap-4">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Challenger</span>
                                <motion.img
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    src={selectedMyPoke?.image}
                                    className="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-2xl"
                                />
                                <p className="text-xl font-black capitalize">{selectedMyPoke?.koName || selectedMyPoke?.name}</p>
                            </div>
                            <div className="text-5xl font-black italic text-muted-foreground/30 animate-pulse">VS</div>
                            <div className="flex flex-col items-center gap-4">
                                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Master</span>
                                <motion.img
                                    animate={{ y: [0, -10, 0], scale: 1.1 }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    src={gym?.pokemon?.image}
                                    className="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-2xl opacity-80"
                                />
                                <p className="text-xl font-black capitalize">{gym?.pokemon?.koName || gym?.pokemon?.name}</p>
                            </div>
                        </div>

                        <Card className="w-full max-w-2xl bg-slate-900 border-4 border-slate-800 rounded-[2rem] p-6 font-mono text-sm overflow-hidden min-h-[180px]">
                            <div className="space-y-2">
                                {battleLog.slice(-5).map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`${log.includes("공격") ? "text-green-400" : log.includes("반격") ? "text-red-400" : "text-slate-300"}`}
                                    >
                                        {`> ${log}`}
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-10 text-center space-y-6">
                        <div className={`text-7xl font-black italic ${winner === 'player' ? 'text-yellow-500 underline decoration-yellow-200' : 'text-slate-400'}`}>
                            {winner === 'player' ? 'CHAMPION' : 'DEFEATED'}
                        </div>
                        <p className="text-xl font-bold text-muted-foreground">
                            {winner === 'player' ? '축하합니다! 새로운 체육관 마스터가 되셨습니다.' : '아쉽습니다. 다음 기회에 도전하세요!'}
                        </p>

                        <Card className="p-10 rounded-[4rem] bg-secondary/20 border-2 overflow-hidden relative">
                            {winner === 'player' && <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>}
                            <img src={winner === 'player' ? selectedMyPoke?.image : gym?.pokemon?.image} className="w-64 h-64 object-contain relative z-10 drop-shadow-2xl" alt="result-poke" />
                        </Card>

                        <div className="flex gap-4">
                            <Button size="lg" className="rounded-full h-14 px-10 font-black text-lg" onClick={() => setGameState("info")}>
                                체육관으로 돌아가기
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
