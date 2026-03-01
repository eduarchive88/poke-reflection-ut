"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Swords, User, Shield, Zap, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 간단한 상성 차트 (1.0 = 보통, 2.0 = 효과 좋음, 0.5 = 효과 별로)
const TYPE_CHART: Record<string, Record<string, number>> = {
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, ground: 2, rock: 2, grass: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 }
    // 추가 상성은 생략 (기본적인 것만 우선 적용)
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

export default function StadiumPage() {
    const router = useRouter();

    interface PokemonData {
        id: string;
        name: string;
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
            // 내 포켓몬
            const myQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const mySnap = await getDocs(myQ);
            const myP: PokemonData[] = [];
            mySnap.forEach(doc => myP.push({ id: doc.id, ...doc.data() } as PokemonData));
            setMyPokemon(myP);

            // 다른 학생의 포켓몬 (샘플로 10명만)
            const oppQ = query(collection(db, "pokemon_inventory"), where("studentId", "!=", studentId), limit(10));
            // 실제 서비스에서는 같은 classId 필터링이 필요하나 고유 인덱스 복잡성을 위해 일단 전체에서 랜덤 추출
            const oppSnap = await getDocs(oppQ);
            const oppP: PokemonData[] = [];
            oppSnap.forEach(doc => oppP.push({ id: doc.id, ...doc.data() } as PokemonData));
            setOpponents(oppP);
        } catch (error) {
            console.error(error);
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

        // 배틀 연출 시작
        runBattleSimulation(myPoke, randomOpp);
    };

    const runBattleSimulation = (player: PokemonData, enemy: PokemonData) => {
        setBattleLog(["배틀 시작!", `${player.name} vs ${enemy.name}`]);

        setTimeout(() => {
            const playerEff = getEffectiveness(player.types, enemy.types);
            const enemyEff = getEffectiveness(enemy.types, player.types);

            // 단순 스탯 계산: 레벨 + 상성
            const playerPower = (player.level || 5) * playerEff;
            const enemyPower = (enemy.level || 5) * enemyEff;

            const logs = [...battleLog];
            logs.push(`${player.name}의 선공!`);
            if (playerEff > 1) logs.push("효과가 굉장했다!");
            if (playerEff < 1) logs.push("효과가 별로인 듯하다...");

            setTimeout(() => {
                if (playerPower >= enemyPower) {
                    setWinner("player");
                    logs.push(`${enemy.name}이(가) 쓰러졌다!`);
                    logs.push("당신의 승리!");
                } else {
                    setWinner("enemy");
                    logs.push(`${player.name}이(가) 지쳤다...`);
                    logs.push("상대의 승리!");
                }
                setBattleLog(logs);
                setTimeout(() => setGameState("result"), 1000);
            }, 1000);
            setBattleLog(logs);
        }, 1000);
    };

    if (!session) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
                        <Swords className="h-8 w-8 text-red-500" />
                        배틀 스타디움
                    </h2>
                    <p className="text-muted-foreground mt-1">상성을 고려해 포켓몬을 출전시키세요!</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === "select" && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                    >
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <User className="h-5 w-5" /> 출전시킬 나의 포켓몬 선택
                        </h3>
                        {myPokemon.length === 0 ? (
                            <Card className="p-12 text-center text-muted-foreground border-dashed">
                                아직 포켓몬이 없습니다. 성찰 일기를 먼저 작성해보세요.
                            </Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {myPokemon.map(poke => (
                                    <Card key={poke.id} className="hover:border-primary cursor-pointer transition-all hover:shadow-md overflow-hidden" onClick={() => startBattle(poke)}>
                                        <CardContent className="flex items-center gap-4 p-4">
                                            <img src={poke.image} alt={poke.name} className="w-16 h-16 object-contain" />
                                            <div>
                                                <p className="font-bold capitalize">{poke.name}</p>
                                                <p className="text-xs text-muted-foreground">Lv.{poke.level} | {poke.types.join(", ")}</p>
                                            </div>
                                            <Button size="sm" className="ml-auto">출전</Button>
                                        </CardContent>
                                    </Card>
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
                        <div className="flex justify-around items-center w-full max-w-2xl">
                            {/* Player */}
                            <motion.div
                                className="flex flex-col items-center"
                                animate={{ x: [0, 20, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <div className="text-xs font-bold mb-2 bg-blue-500 text-white px-2 py-0.5 rounded">YOU</div>
                                <img src={selectedMyPoke.image} className="w-32 h-32 md:w-48 md:h-48 drop-shadow-lg" alt={selectedMyPoke.name} />
                                <p className="font-bold text-lg mt-4 capitalize">{selectedMyPoke.name}</p>
                                <div className="flex gap-1 mt-1">
                                    {selectedMyPoke.types.map((t: string) => <span key={t} className="text-[10px] bg-secondary px-2 rounded">{t}</span>)}
                                </div>
                            </motion.div>

                            <div className="text-4xl font-black italic text-muted-foreground animate-pulse">VS</div>

                            {/* Enemy */}
                            <motion.div
                                className="flex flex-col items-center"
                                animate={{ x: [0, -20, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <div className="text-xs font-bold mb-2 bg-red-500 text-white px-2 py-0.5 rounded">RIVAL</div>
                                <img src={selectedOpponent.image} className="w-32 h-32 md:w-48 md:h-48 drop-shadow-lg" alt={selectedOpponent.name} />
                                <p className="font-bold text-lg mt-4 capitalize">{selectedOpponent.name}</p>
                                <div className="flex gap-1 mt-1">
                                    {selectedOpponent.types.map((t: string) => <span key={t} className="text-[10px] bg-secondary px-2 rounded">{t}</span>)}
                                </div>
                            </motion.div>
                        </div>

                        <Card className="w-full max-w-md bg-black text-green-400 font-mono text-sm p-4 h-32 overflow-hidden border-2 border-primary/20">
                            {battleLog.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-500">{`> ${log}`}</div>)}
                        </Card>
                    </motion.div>
                )}

                {gameState === "result" && selectedMyPoke && selectedOpponent && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center space-y-6 text-center"
                    >
                        <div className={`text-6xl font-black italic ${winner === 'player' ? 'text-yellow-500' : 'text-gray-500'}`}>
                            {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
                        </div>
                        <p className="text-xl text-muted-foreground">
                            {winner === 'player'
                                ? `${selectedMyPoke.name}의 환상적인 승리!`
                                : `아쉽게도 ${selectedOpponent.name}에게 패배했습니다.`}
                        </p>
                        <Card className="p-8 flex flex-col items-center space-y-4">
                            <img src={winner === 'player' ? selectedMyPoke.image : selectedOpponent.image} className="w-48 h-48 drop-shadow-2xl" alt="winner" />
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <Zap className="h-5 w-5" />
                                경험치를 획득했습니다! (가상)
                            </div>
                        </Card>
                        <div className="flex gap-4">
                            <Button size="lg" variant="outline" onClick={() => setGameState("select")} className="gap-2">
                                <RefreshCcw className="h-5 w-5" /> 다시 선택
                            </Button>
                            <Button size="lg" onClick={() => router.push("/student/pokedex")}>도감으로 이동</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
