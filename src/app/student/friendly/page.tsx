"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc,
    addDoc, updateDoc, onSnapshot, serverTimestamp,
    deleteDoc, orderBy, limit, increment
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Swords, User, Shield, Zap, Heart, RefreshCcw, Send, Check, X, Timer, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Student {
    id: string;
    name: string;
}

interface PokemonData {
    id: string;
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

interface BattleRequest {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    status: 'pending' | 'accepted' | 'declined' | 'battling';
    fromPokes?: PokemonData[];
    toPokes?: PokemonData[];
}

export default function FriendlyMatchPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [myPokemon, setMyPokemon] = useState<PokemonData[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeRequest, setActiveRequest] = useState<BattleRequest | null>(null);
    const [incomingRequest, setIncomingRequest] = useState<BattleRequest | null>(null);

    // UI State
    const [gameState, setGameState] = useState<"lobby" | "select" | "battle" | "result">("lobby");
    const [selectedTeam, setSelectedTeam] = useState<PokemonData[]>([]);
    const [opponentTeam, setOpponentTeam] = useState<PokemonData[]>([]);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [winner, setWinner] = useState<"me" | "opponent" | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);

        fetchInitialData(sessionData.studentId, sessionData.classId);
        listenForRequests(sessionData.studentId);
    }, [router]);

    const fetchInitialData = async (studentId: string, classId: string) => {
        setLoading(true);
        try {
            // 1. 같은 반 학생 목록 (나 제외)
            const sQ = query(collection(db, "students"), where("classId", "==", classId));
            const sSnap = await getDocs(sQ);
            const sList: Student[] = [];
            sSnap.forEach(doc => {
                if (doc.id !== studentId) {
                    sList.push({ id: doc.id, name: doc.data().name });
                }
            });
            setStudents(sList);

            // 2. 내 포켓몬 (리타이어 안 된 것)
            const now = new Date();
            const pQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const pSnap = await getDocs(pQ);
            const pList: PokemonData[] = [];
            pSnap.forEach(doc => {
                const data = doc.data();
                let retiredUntilDate = null;
                if (data.retiredUntil) {
                    try {
                        if (typeof data.retiredUntil.toDate === 'function') {
                            retiredUntilDate = data.retiredUntil.toDate();
                        } else if (data.retiredUntil instanceof Date) {
                            retiredUntilDate = data.retiredUntil;
                        } else if (data.retiredUntil.seconds) {
                            // Timestamp-like object
                            retiredUntilDate = new Date(data.retiredUntil.seconds * 1000);
                        }
                    } catch (e) {
                        console.warn("retiredUntil conversion failed:", e);
                    }
                }
                if (!retiredUntilDate || retiredUntilDate < now) {
                    pList.push({ id: doc.id, ...data } as PokemonData);
                }
            });
            setMyPokemon(pList);
        } catch (error) {
            console.error("fetchInitialData Error:", error);
            toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const listenForRequests = (studentId: string) => {
        // 들어오는 요청 감지
        const qTo = query(collection(db, "battle_requests"), where("toId", "==", studentId), where("status", "==", "pending"));
        const unsubscribeTo = onSnapshot(qTo, (snapshot) => {
            if (!snapshot.empty) {
                const req = snapshot.docs[0];
                setIncomingRequest({ id: req.id, ...req.data() } as BattleRequest);
            } else {
                setIncomingRequest(null);
            }
        });

        // 내가 보낸 요청 상태 감지
        const qFrom = query(collection(db, "battle_requests"), where("fromId", "==", studentId), where("status", "in", ["pending", "accepted", "declined", "battling"]));
        const unsubscribeFrom = onSnapshot(qFrom, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = { id: change.doc.id, ...change.doc.data() } as BattleRequest;
                if (change.type === "added" || change.type === "modified") {
                    setActiveRequest(data);
                    if (data.status === "accepted") {
                        toast.success("상대방이 대결을 수락했습니다!");
                        setGameState("select");
                    } else if (data.status === "declined") {
                        toast.error("상대방이 대결을 거절했습니다.");
                        deleteDoc(doc(db, "battle_requests", data.id));
                        setActiveRequest(null);
                    }
                }
            });
        });

        return () => {
            unsubscribeTo();
            unsubscribeFrom();
        };
    };

    const sendRequest = async (target: Student) => {
        if (activeRequest) {
            toast.error("이미 진행 중인 대결 신청이 있습니다.");
            return;
        }

        if (!session?.studentId || !session?.studentInfo?.name) {
            toast.error("세션 정보가 올바르지 않습니다. 다시 로그인해주세요.");
            return;
        }

        try {
            // session.studentInfo.name이 없을 경우를 대비해 name 필드 확인
            const fromName = session.studentInfo?.name || session.name || "익명 학생";

            await addDoc(collection(db, "battle_requests"), {
                fromId: session.studentId,
                fromName: fromName,
                toId: target.id,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast.success(`${target.name}님에게 대결을 신청했습니다!`);
        } catch (e) {
            console.error("sendRequest Error:", e);
            toast.error("대결 신청 실패. 잠시 후 다시 시도해주세요.");
        }
    };

    const cancelRequest = async () => {
        if (!activeRequest) return;
        try {
            await deleteDoc(doc(db, "battle_requests", activeRequest.id));
            setActiveRequest(null);
            toast.info("대결 신청을 취소했습니다.");
        } catch (e) {
            toast.error("취소 실패");
        }
    };

    const acceptRequest = async () => {
        if (!incomingRequest) return;
        try {
            await updateDoc(doc(db, "battle_requests", incomingRequest.id), {
                status: 'accepted'
            });
            setGameState("select");
        } catch (e) {
            toast.error("수락 실패");
        }
    };

    const declineRequest = async () => {
        if (!incomingRequest) return;
        try {
            await updateDoc(doc(db, "battle_requests", incomingRequest.id), {
                status: 'declined'
            });
            setIncomingRequest(null);
        } catch (e) {
            toast.error("거절 실패");
        }
    };

    const togglePokeSelection = (poke: PokemonData) => {
        if (selectedTeam.find(p => p.id === poke.id)) {
            setSelectedTeam(prev => prev.filter(p => p.id !== poke.id));
        } else {
            if (selectedTeam.length >= 3) {
                toast.error("최대 3마리까지만 선택 가능합니다.");
                return;
            }
            setSelectedTeam(prev => [...prev, poke]);
        }
    };

    const confirmSelection = async () => {
        if (selectedTeam.length === 0) {
            toast.error("최소 1마리 이상의 포켓몬을 선택해주세요.");
            return;
        }

        const reqId = activeRequest?.id || incomingRequest?.id;
        if (!reqId) return;

        try {
            const updateField = activeRequest ? "fromPokes" : "toPokes";
            await updateDoc(doc(db, "battle_requests", reqId), {
                [updateField]: selectedTeam
            });

            // 상대방의 선택 기다리기
            toast.info("상대방의 선택을 기다리는 중...");

            const unsubscribe = onSnapshot(doc(db, "battle_requests", reqId), (snapshot) => {
                const data = snapshot.data();
                if (data?.fromPokes && data?.toPokes) {
                    setOpponentTeam(activeRequest ? data.toPokes : data.fromPokes);
                    setGameState("battle");
                    unsubscribe();
                    run3v3Battle(selectedTeam, activeRequest ? data.toPokes : data.fromPokes);
                }
            });
        } catch (e) {
            toast.error("선택 저장 실패");
        }
    };

    const quitBattle = async () => {
        const reqId = activeRequest?.id || incomingRequest?.id;
        if (!reqId) {
            setGameState("lobby");
            return;
        }
        try {
            await deleteDoc(doc(db, "battle_requests", reqId));
            setActiveRequest(null);
            setIncomingRequest(null);
            setGameState("lobby");
            setSelectedTeam([]);
            toast.info("대결을 종료했습니다.");
        } catch (e) {
            setGameState("lobby");
        }
    };

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

    const run3v3Battle = (myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setBattleLog(["3v3 친선 경기 시작!", "서로의 포켓몬이 입장합니다!"]);

        let myIdx = 0;
        let oppIdx = 0;
        let logs: string[] = ["배틀 시작!"];

        // 현재 매치업의 HP 상태
        let currentMyHp = 0;
        let currentOppHp = 0;

        const nextTurn = () => {
            if (myIdx >= myTeam.length || oppIdx >= oppTeam.length) {
                const isWin = myIdx < myTeam.length;
                finish3v3Battle(isWin, myTeam, oppTeam);
                return;
            }

            const me = myTeam[myIdx];
            const opp = oppTeam[oppIdx];

            // 새 포켓몬이 나올 때 HP 초기화
            if (currentMyHp <= 0) currentMyHp = (me.stats?.hp || 100) + (me.level * 2);
            if (currentOppHp <= 0) currentOppHp = (opp.stats?.hp || 100) + (opp.level * 2);

            logs.push(`[라운드] ${me.koName || me.name} (나) VS ${opp.koName || opp.name} (상대)`);

            // 공격 순서 및 데미지 계산
            const myEff = getEffectiveness(me.types, opp.types);
            const oppEff = getEffectiveness(opp.types, me.types);

            const myDmg = Math.max(10, Math.floor(((me.level * 2 + (me.stats?.attack || 40) * myEff) / ((opp.stats?.defense || 40) * 0.5)) * 0.8));
            const oppDmg = Math.max(10, Math.floor(((opp.level * 2 + (opp.stats?.attack || 40) * oppEff) / ((me.stats?.defense || 40) * 0.5)) * 0.8));

            // 한 턴에 서로 동시에 공격한다고 가정 (심플화)
            currentOppHp -= myDmg;
            logs.push(`${me.koName || me.name}의 공격! ${myDmg} 데미지!`);
            if (myEff > 1) logs.push("효과가 굉장했다!");

            if (currentOppHp > 0) {
                currentMyHp -= oppDmg;
                logs.push(`${opp.koName || opp.name}의 반격! ${oppDmg} 데미지!`);
                if (oppEff > 1) logs.push("효과가 굉장했다!");
            }

            if (currentOppHp <= 0) {
                logs.push(`${opp.koName || opp.name} 리타이어!`);
                oppIdx++;
                currentOppHp = 0;
            } else if (currentMyHp <= 0) {
                logs.push(`${me.koName || me.name} 리타이어!`);
                myIdx++;
                currentMyHp = 0;
            }

            setBattleLog([...logs.slice(-6)]); // 최근 6개 로그만 유지
            setTimeout(nextTurn, 1200);
        };

        setTimeout(nextTurn, 2000);
    };

    const finish3v3Battle = async (isWin: boolean, myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setWinner(isWin ? "me" : "opponent");
        setBattleLog(prev => [...prev, isWin ? "축하합니다! 최종 승리하셨습니다!" : "아쉽게도 최종 패배하셨습니다."]);

        // 리타이어 처리 (패배한 모든 내 포켓몬 12시간 쿨다운)
        // 친선전은 패배한 쪽의 팀 전체가 리타이어됨
        if (!isWin) {
            const retiredTime = new Date();
            retiredTime.setHours(retiredTime.getHours() + 12);

            try {
                for (const poke of myTeam) {
                    await updateDoc(doc(db, "pokemon_inventory", poke.id), {
                        retiredUntil: retiredTime
                    });
                }
                toast.info("패배한 포켓몬들이 12시간 동안 휴식에 들어갑니다.");
            } catch (e) {
                console.error("리타이어 처리 실패:", e);
            }
        }

        setGameState("result");

        // 요청 데이터 삭제 (뒷정리)
        const reqId = activeRequest?.id || incomingRequest?.id;
        if (reqId) {
            setTimeout(() => {
                deleteDoc(doc(db, "battle_requests", reqId)).catch(() => { });
            }, 10000);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-[60vh]">친구 목록 로딩 중...</div>;

    return (
        <div className="space-y-6">
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
                        <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
                            <Users className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic tracking-tighter pokemon-gradient-text">친선 경기</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Friendly Match</p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {incomingRequest && gameState === "lobby" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                        <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2.5rem] p-6 shadow-xl border-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 p-3 rounded-full animate-pulse">
                                        <Swords className="h-8 w-8 text-yellow-300" />
                                    </div>
                                    <div>
                                        <p className="font-black text-xl">{incomingRequest.fromName}님의 대결 신청!</p>
                                        <p className="text-sm text-blue-100">친구의 도전을 수락하시겠습니까?</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={acceptRequest} className="bg-white text-blue-700 hover:bg-blue-50 rounded-full px-6 font-bold">수락</Button>
                                    <Button onClick={declineRequest} variant="ghost" className="text-white hover:bg-white/10 rounded-full font-bold">거절</Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {gameState === "lobby" && (
                    <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="rounded-[3rem] p-8 border-2 bg-secondary/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary" /> 온라인 친구 목록
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {students.length === 0 ? (
                                        <p className="text-center py-10 text-muted-foreground italic">현재 접속 중인 다른 학생이 없습니다.</p>
                                    ) : (
                                        students.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-4 bg-background border-2 rounded-[1.5rem] hover:border-primary/50 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-primary">
                                                        {s.name[0]}
                                                    </div>
                                                    <span className="font-black">{s.name}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="rounded-full gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    disabled={!!activeRequest}
                                                    onClick={() => sendRequest(s)}
                                                >
                                                    <Send className="h-3 w-3" /> 신청
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-[3rem] p-8 border-2 bg-slate-900 text-white">
                                <h3 className="text-2xl font-black mb-4">전투 규칙 (3v3)</h3>
                                <div className="space-y-4 text-sm text-slate-300">
                                    <p className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> 최대 3마리의 포켓몬을 엔트리에 등록합니다.</p>
                                    <p className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> 첫 번째 포켓몬부터 순서대로 출전합니다.</p>
                                    <p className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> 패배한 포켓몬은 12시간 동안 배틀이 불가합니다.</p>
                                    <p className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> 친선 경기는 경험치를 획득하지 않습니다.</p>
                                </div>
                                {activeRequest && activeRequest.status === 'pending' && (
                                    <div className="mt-8 p-6 bg-primary/20 rounded-3xl border border-primary/30 flex flex-col items-center gap-3 animate-pulse">
                                        <p className="text-sm font-bold text-primary-foreground">상대방의 수락을 기다리는 중...</p>
                                        <Button variant="destructive" size="sm" onClick={cancelRequest} className="rounded-full">신청 취소</Button>
                                    </div>
                                )}
                                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 text-xs italic text-center text-slate-400">
                                    상대방이 신청을 수락하면 포켓몬 선택 화면으로 이동합니다.
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                )}

                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {myPokemon.map(poke => {
                                const isSelected = selectedTeam.find(p => p.id === poke.id);
                                const order = selectedTeam.findIndex(p => p.id === poke.id) + 1;
                                return (
                                    <Card
                                        key={poke.id}
                                        className={`rounded-[2rem] p-4 cursor-pointer relative overflow-hidden transition-all border-4 ${isSelected ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        onClick={() => togglePokeSelection(poke)}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-black">
                                                {order}
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center">
                                            <img src={poke.image} className="w-32 h-32 object-contain" alt={poke.name} />
                                            <p className="font-bold mt-2">{poke.koName || poke.name}</p>
                                            <p className="text-xs text-muted-foreground font-medium">Lv.{poke.level}</p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-4 mt-8">
                            <Button variant="outline" size="lg" className="rounded-full px-12" onClick={quitBattle}>
                                대결 그만두기
                            </Button>
                            <Button size="lg" className="rounded-full px-12 font-bold" onClick={confirmSelection} disabled={selectedTeam.length === 0}>
                                선택 완료 ({selectedTeam.length}/3)
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-12 py-10">
                        <div className="flex justify-between w-full max-w-4xl px-4 relative">
                            {/* Me */}
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex gap-1 h-3">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`w-10 rounded-full ${i < selectedTeam.length ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                    ))}
                                </div>
                                <motion.img
                                    animate={{ x: [0, 5, 0], rotate: [0, 2, 0] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    src={selectedTeam[0]?.image}
                                    className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl"
                                />
                                <p className="text-2xl font-black">{selectedTeam[0]?.koName || selectedTeam[0]?.name}</p>
                            </div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black italic text-slate-200 pointer-events-none uppercase">vs</div>

                            {/* Opponent */}
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex gap-1 h-3 justify-end">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`w-10 rounded-full ${i < opponentTeam.length ? 'bg-red-500' : 'bg-slate-300'}`} />
                                    ))}
                                </div>
                                <motion.img
                                    animate={{ x: [0, -5, 0], rotate: [0, -2, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                    src={opponentTeam[0]?.image}
                                    className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl grayscale"
                                />
                                <p className="text-2xl font-black">{opponentTeam[0]?.koName || opponentTeam[0]?.name}</p>
                            </div>
                        </div>

                        <Card className="w-full max-w-2xl bg-slate-900 p-8 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden min-h-[200px]">
                            <div className="space-y-3 font-mono">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`text-sm ${log.includes("승리") ? "text-yellow-400 font-bold" : "text-slate-300"}`}
                                    >
                                        {`> ${log}`}
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-10 py-10">
                        <div className={`text-8xl font-black italic tracking-tighter ${winner === 'me' ? 'text-blue-500' : 'text-red-500 underline decoration-red-200'}`}>
                            {winner === 'me' ? 'WINNER!' : 'DEFEATED'}
                        </div>

                        <div className="flex gap-8 items-center">
                            {selectedTeam.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                    className="flex flex-col items-center bg-secondary/10 p-6 rounded-[3rem] border-2"
                                >
                                    <img src={p.image} className="w-32 h-32 object-contain" alt={p.name} />
                                    <p className="font-black mt-2">{p.koName || p.name}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <Button size="lg" className="rounded-full h-16 px-12 font-black text-xl" onClick={() => window.location.reload()}>
                                <RefreshCcw className="h-6 w-6 mr-2" /> 로비로 돌아가기
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
