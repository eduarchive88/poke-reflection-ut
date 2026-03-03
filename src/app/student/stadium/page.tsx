"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Swords, User, Shield, Zap, RefreshCcw, ChevronLeft, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 간단한 상성 차트 (1.0 = 보통, 2.0 = 효과 좋음, 0.5 = 효과 별로)
const TYPE_CHART: Record<string, Record<string, number>> = {
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, ground: 2, rock: 2, grass: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 }
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

    const runBattleSimulation = (player: PokemonData, enemy: PokemonData) => {
        setBattleLog(["Battle Start!", `${player.koName || player.name} VS ${enemy.koName || enemy.name}`]);

        setTimeout(() => {
            const playerEff = getEffectiveness(player.types, enemy.types);
            const enemyEff = getEffectiveness(enemy.types, player.types);

            const playerPower = (player.level || 5) * playerEff + (Math.random() * 5);
            const enemyPower = (enemy.level || 5) * enemyEff + (Math.random() * 5);

            const logs = [...battleLog];
            logs.push(`${player.koName || player.name}의 맹공격!`);
            if (playerEff > 1) logs.push("효과가 굉장했다!");
            if (playerEff < 1) logs.push("효과가 별로인 듯하다...");

            setTimeout(async () => {
                let battleWinnerId = "";
                let battleWinnerName = "";
                let battleLoserId = "";
                let battleLoserName = "";
                let winnerPoke = "";
                let loserPoke = "";

                if (playerPower >= enemyPower) {
                    setWinner("player");
                    logs.push(`${enemy.koName || enemy.name}이(가) 쓰러졌다!`);
                    logs.push("당신의 승리!");
                    battleWinnerId = player.studentId;
                    battleWinnerName = session?.name || "나";
                    battleLoserId = enemy.studentId;
                    battleLoserName = "상대";
                    winnerPoke = player.koName || player.name;
                    loserPoke = enemy.koName || enemy.name;
                } else {
                    setWinner("enemy");
                    logs.push(`${player.koName || player.name}이(가) 지쳤다...`);
                    logs.push("경쟁자의 승리!");
                    battleWinnerId = enemy.studentId;
                    battleWinnerName = "상대";
                    battleLoserId = player.studentId;
                    battleLoserName = session?.name || "나";
                    winnerPoke = enemy.koName || enemy.name;
                    loserPoke = player.koName || player.name;
                }

                try {
                    await addDoc(collection(db, "battle_logs"), {
                        classId: session?.classId,
                        winnerId: battleWinnerId,
                        winnerName: battleWinnerName,
                        loserId: battleLoserId,
                        loserName: battleLoserName,
                        winnerPoke: winnerPoke,
                        loserPoke: loserPoke,
                        createdAt: serverTimestamp(),
                        type: 'stadium'
                    });
                } catch (e) {
                    console.error("배틀 로그 저장 실패:", e);
                }

                setBattleLog(logs);
                setTimeout(() => setGameState("result"), 1200);
            }, 1200);
            setBattleLog(logs);
        }, 1200);
    };

    if (!session) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-full hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/30">
                            <Swords className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic tracking-tighter pokemon-gradient-text uppercase">Battle Stadium</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Competitive Arena</p>
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
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" /> 나의 포켓몬 선택
                            </h3>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{myPokemon.length} AVAILABLE</span>
                        </div>

                        {loading ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 rounded-[2rem] bg-slate-800/10 animate-pulse border-2 border-dashed border-slate-700/20" />
                                ))}
                            </div>
                        ) : myPokemon.length === 0 ? (
                            <Card className="p-20 text-center border-dashed border-2 rounded-[3rem] bg-slate-800/5">
                                <div className="space-y-4">
                                    <Sparkles className="h-12 w-12 text-slate-400 mx-auto" />
                                    <div>
                                        <p className="text-xl font-bold">아직 포켓몬이 없습니다!</p>
                                        <p className="text-sm text-slate-500 mt-1">성찰 일기를 작성하여 첫 번째 동료를 만나보세요.</p>
                                    </div>
                                    <Button onClick={() => router.push("/student/write")} className="rounded-full px-8">일기 쓰러 가기</Button>
                                </div>
                            </Card>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {myPokemon.map(poke => (
                                    <motion.div
                                        key={poke.id}
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            className="group relative overflow-hidden h-32 cursor-pointer transition-all border-2 bg-card hover:border-primary/50 shadow-sm rounded-[2rem]"
                                            onClick={() => startBattle(poke)}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                                <Trophy className="h-20 w-20 rotate-12" />
                                            </div>
                                            <CardContent className="flex items-center gap-6 h-full p-6">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform" />
                                                    <img src={poke.image} alt={poke.name} className="w-20 h-20 object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-black italic text-primary">Lv.{poke.level}</span>
                                                        <h4 className="font-black text-lg">{poke.koName || poke.name}</h4>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {poke.types.map((t) => (
                                                            <span key={t} className="text-[8px] font-bold uppercase bg-slate-800/10 px-1.5 py-0.5 rounded border border-slate-800/20">{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Swords className="h-5 w-5 text-primary" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
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
                        className="flex flex-col items-center justify-center space-y-12 py-12"
                    >
                        <div className="flex justify-around items-center w-full max-w-4xl relative">
                            {/* VS Text Overlay */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                                <span className="text-9xl font-black italic text-slate-800/10 select-none">VERSUS</span>
                            </div>

                            {/* Player */}
                            <motion.div
                                className="flex flex-col items-center z-10"
                                animate={{ x: [0, 30, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <div className="text-[10px] font-black mb-4 bg-primary text-primary-foreground px-4 py-1 rounded-full shadow-lg shadow-primary/30 uppercase tracking-widest">YOU</div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                    <img src={selectedMyPoke.image} className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-2xl" alt={selectedMyPoke.name} />
                                </div>
                                <p className="font-black text-3xl mt-6 italic tracking-tighter uppercase">{selectedMyPoke.koName || selectedMyPoke.name}</p>
                                <div className="flex gap-2 mt-2">
                                    {selectedMyPoke.types.map((t: string) => <span key={t} className="text-[10px] font-bold bg-slate-800/10 border px-3 py-1 rounded-full uppercase">{t}</span>)}
                                </div>
                                <div className="mt-4 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Status</span>
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border">
                                        <motion.div animate={{ width: ['100%', '80%', '100%'] }} className="h-full bg-green-500" />
                                    </div>
                                </div>
                            </motion.div>

                            <div className="text-6xl font-black italic text-primary animate-pulse z-10 drop-shadow-2xl">VS</div>

                            {/* Enemy */}
                            <motion.div
                                className="flex flex-col items-center z-10"
                                animate={{ x: [0, -30, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <div className="text-[10px] font-black mb-4 bg-red-500 text-white px-4 py-1 rounded-full shadow-lg shadow-red-500/30 uppercase tracking-widest">RIVAL</div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full animate-pulse" />
                                    <img src={selectedOpponent.image} className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-2xl" alt={selectedOpponent.name} />
                                </div>
                                <p className="font-black text-3xl mt-6 italic tracking-tighter uppercase">{selectedOpponent.koName || selectedOpponent.name}</p>
                                <div className="flex gap-2 mt-2">
                                    {selectedOpponent.types.map((t: string) => <span key={t} className="text-[10px] font-bold bg-slate-800/10 border px-3 py-1 rounded-full uppercase">{t}</span>)}
                                </div>
                                <div className="mt-4 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Status</span>
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border">
                                        <motion.div animate={{ width: ['100%', '70%', '100%'] }} className="h-full bg-red-500" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <Card className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                            <div className="space-y-4 max-h-48 overflow-y-auto pr-4 scrollbar-hide">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-3 text-sm font-bold text-slate-300"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {log}
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {gameState === "result" && selectedMyPoke && selectedOpponent && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-10"
                    >
                        <div className="relative mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                className={`text-8xl sm:text-9xl font-black italic tracking-tighter drop-shadow-2xl ${winner === 'player' ? 'text-amber-500' : 'text-slate-500'}`}
                            >
                                {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
                            </motion.div>
                            {winner === 'player' && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 z-[-1] opacity-20"
                                >
                                    <Sparkles className="h-full w-full text-amber-500" />
                                </motion.div>
                            )}
                        </div>

                        <p className="text-2xl font-bold mb-12">
                            {winner === 'player'
                                ? `${selectedMyPoke.koName || selectedMyPoke.name}의 화려한 승리입니다!`
                                : `아쉽게도 ${selectedOpponent.koName || selectedOpponent.name}의 힘이 더 강력했습니다.`}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-8 w-full max-w-2xl">
                            <Card className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center ${winner === 'player' ? 'border-primary/50 bg-primary/5' : 'border-slate-800/20 bg-slate-800/5'}`}>
                                <h5 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest">Winning Pokemon</h5>
                                <img
                                    src={winner === 'player' ? selectedMyPoke.image : selectedOpponent.image}
                                    className="w-48 h-48 object-contain drop-shadow-2xl mb-6 hover:scale-110 transition-transform"
                                    alt="winner"
                                />
                                <span className="font-black text-2xl uppercase italic tracking-tighter">
                                    {winner === 'player' ? (selectedMyPoke.koName || selectedMyPoke.name) : (selectedOpponent.koName || selectedOpponent.name)}
                                </span>
                            </Card>

                            <Card className="p-8 rounded-[2.5rem] bg-secondary/30 flex flex-col justify-center border-border/50">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-500/20 rounded-2xl">
                                            <Zap className="h-6 w-6 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase">Rewards</p>
                                            <p className="font-bold">경험치를 획득했습니다! (가상)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                                            <Trophy className="h-6 w-6 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase">Season Rank</p>
                                            <p className="font-bold">+15 Battle Points</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md">
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => setGameState("select")}
                                className="flex-1 h-14 rounded-full font-bold gap-2"
                            >
                                <RefreshCcw className="h-5 w-5" /> 다시 도전하기
                            </Button>
                            <Button
                                size="lg"
                                onClick={() => router.push("/student")}
                                className="flex-1 h-14 rounded-full font-bold bg-slate-900 hover:bg-black text-white"
                            >
                                대시보드 환전
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
