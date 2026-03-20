"use client";

import { useEffect, useState } from "react";
import { useTeacherClass } from "@/contexts/TeacherClassContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { PokemonImage } from "@/components/PokemonImage";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
    defenseCount?: number;
}

export default function TeacherGymDashboard() {
    const { selectedClassId, classes } = useTeacherClass();
    const router = useRouter();
    const [gym, setGym] = useState<GymData | null>(null);
    const [loading, setLoading] = useState(true);

    const activeClass = classes.find(c => c.id === selectedClassId);

    useEffect(() => {
        if (!selectedClassId) {
            setGym(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        // 실시간 동기화로 변경 (체육관 배틀은 자주 일어나므로)
        const gymRef = doc(db, "gyms", selectedClassId);
        const unsubscribe = onSnapshot(gymRef, (docSnap) => {
            if (docSnap.exists()) {
                setGym(docSnap.data() as GymData);
            } else {
                setGym(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching gym data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedClassId]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            let date;
            if (typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                return "-";
            }
            return date.toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return "-";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" className="w-12 h-12 animate-bounce" style={{ imageRendering: 'pixelated' }} alt="Loading" />
                <p className="font-extrabold animate-pulse uppercase tracking-widest text-base shadow-sm">
                    체육관 정보를 불러오는 중...
                </p>
            </div>
        );
    }

    if (!selectedClassId || !activeClass) {
        return (
            <div className="retro-box bg-white p-12 text-center max-w-2xl mx-auto my-12 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <div className="text-6xl mb-6">🏛️</div>
                <h2 className="text-2xl font-black pixel-text text-red-600 mb-4 tracking-tighter">선택된 학급이 없습니다</h2>
                <p className="text-sm font-bold text-gray-700 pixel-text mb-8">체육관 현황을 보려면 먼저 학급을 선택해주세요.</p>
                <Button onClick={() => router.push("/dashboard/classes")} className="pixel-button bg-blue-500 text-white font-black hover:bg-blue-600 border-2 border-black">
                    학급 관리로 이동
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="rounded-none hover:bg-gray-200 border-2 border-transparent hover:border-black transition-none h-12 w-12"
                    >
                        <span className="text-2xl">◀</span>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-400 border-2 border-black flex items-center justify-center w-12 h-12">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/vs-seeker.png" className="w-8 h-8 drop-shadow-sm" style={{ imageRendering: 'pixelated' }} alt="Gym Status" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black pixel-text uppercase">Gym Status</h2>
                            <p className="text-[10px] sm:text-xs text-gray-600 font-bold pixel-text uppercase mt-1">체육관 현황 ➖ {activeClass.className}</p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="grid gap-6 md:grid-cols-12">

                        {/* 현재 마스터 정보 카드 */}
                        <div className="md:col-span-7 xl:col-span-8">
                            <div className="pixel-box bg-white overflow-hidden relative border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col h-full">
                                <div className="absolute inset-0 bg-yellow-300 opacity-20" />
                                <div className="text-center p-4 relative z-10 w-full border-b-4 border-black bg-yellow-400">
                                    <h3 className="text-xl font-black pixel-text text-black uppercase tracking-widest mt-1 flex items-center gap-2 justify-center">
                                        <span className="text-2xl">⚡</span> HALL OF FAME <span className="text-2xl">⚡</span>
                                    </h3>
                                </div>

                                <div className="flex flex-col items-center relative z-10 p-6 sm:p-10 w-full flex-grow">
                                    {gym && gym.leaderId ? (
                                        <>
                                            <div className="bg-black text-yellow-400 px-4 py-1 border-2 border-black uppercase pixel-text text-xs mb-6 shadow-[2px_2px_0_0_rgba(250,204,21,1)]">
                                                Gym Leader
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-center gap-8 w-full max-w-2xl mx-auto">
                                                {/* 마스터 이미지 영역 */}
                                                <div className="flex flex-col items-center">
                                                    <div className="relative mb-4">
                                                        <div className="w-48 h-48 bg-white border-4 border-black flex items-center justify-center p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:scale-105 transition-transform cursor-crosshair group relative">
                                                            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gray-200 border-t-4 border-black z-0" />
                                                            <PokemonImage
                                                                id={gym.pokemon?.pokemonId || 0}
                                                                name={gym.pokemon?.koName || gym.pokemon?.name}
                                                                className="w-full h-full object-contain pixelated relative z-10 filter drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] group-hover:drop-shadow-[0_8px_0_rgba(0,0,0,0.4)] transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-3xl font-black pixel-text mb-1 text-center">
                                                        {gym.leaderName}
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-500 pixel-text text-center">현재 마스터</p>
                                                </div>

                                                {/* 마스터 포켓몬 스탯 영역 */}
                                                <div className="flex-1 w-full mt-4 sm:mt-0 bg-gray-50 border-2 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                                    <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
                                                        <h4 className="text-2xl font-black pixel-text text-indigo-700 truncate pr-2">
                                                            {gym.pokemon?.koName || gym.pokemon?.name}
                                                        </h4>
                                                        <span className="text-[10px] sm:text-xs font-bold bg-yellow-300 border-2 border-black px-2 py-1 shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
                                                            Lv.{gym.pokemon?.level}
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-1 mb-4">
                                                        {gym.pokemon?.types?.map(t => (
                                                            <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white border border-black px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase pixel-text`}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center bg-white p-2 border-2 border-gray-200">
                                                            <span className="text-xs font-bold pixel-text text-gray-500 flex items-center gap-1"><span className="text-sm">❤️</span> HP</span>
                                                            <span className="text-xl font-black pixel-text">{gym.pokemon?.stats?.hp || 100}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white p-2 border-2 border-gray-200">
                                                            <span className="text-xs font-bold pixel-text text-gray-500 flex items-center gap-1"><span className="text-sm">⚔️</span> ATK</span>
                                                            <span className="text-xl font-black pixel-text">{gym.pokemon?.stats?.attack || 40}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white p-2 border-2 border-gray-200">
                                                            <span className="text-xs font-bold pixel-text text-gray-500 flex items-center gap-1"><span className="text-sm">🛡️</span> DEF</span>
                                                            <span className="text-xl font-black pixel-text">{gym.pokemon?.stats?.defense || 40}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-20 text-center flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-gray-200 border-4 border-black rounded-full mb-6 flex items-center justify-center animate-pulse">
                                                <span className="text-4xl text-gray-400">?</span>
                                            </div>
                                            <p className="text-3xl font-black pixel-text mb-4 text-gray-500">빈 체육관</p>
                                            <p className="text-sm font-bold pixel-text text-gray-400">
                                                아직 체육관을 차지한 학생이 없습니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 방어 기록 & 통계 카드 */}
                        <div className="md:col-span-5 xl:col-span-4 flex flex-col gap-6">
                            <div className="pixel-box bg-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-4 border-black flex-1">
                                <h3 className="text-lg sm:text-xl font-black pixel-text mb-6 border-b-4 border-black pb-3 flex items-center gap-2">
                                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/journal.png" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} alt="Journal" />
                                    체육관 기록
                                </h3>

                                {gym && gym.leaderId ? (
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 p-4 border-2 border-black flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pixel-text">점령 일시</span>
                                            <span className="font-bold text-sm sm:text-base pixel-text text-blue-700">{formatDate(gym?.occupiedAt)}</span>
                                        </div>

                                        <div className="bg-gray-50 p-4 border-2 border-black flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pixel-text">최근 보상 수령</span>
                                            <span className="font-bold text-sm sm:text-base pixel-text text-green-700">{formatDate(gym?.lastRewardAt)}</span>
                                            <span className="text-[10px] text-gray-400 mt-1 pixel-text leading-tight">1주일 마다 캔디 3개가 보상으로 지급됩니다.</span>
                                        </div>

                                        <div className="bg-red-50 p-4 border-2 border-red-500 flex flex-col items-center justify-center text-center mt-auto shadow-[2px_2px_0_0_rgba(239,68,68,1)]">
                                            <div className="text-3xl mb-1 mt-2">🛡️</div>
                                            <span className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 pixel-text">방어 횟수</span>
                                            <div className="text-4xl font-black text-red-600 pixel-text my-2 drop-shadow-md">
                                                {gym.defenseCount || 0} <span className="text-lg text-red-400">회</span>
                                            </div>
                                            <span className="text-[10px] text-red-500 mt-1 font-bold pixel-text">도전자의 공격을 막아낸 횟수입니다.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-center bg-gray-50 border-2 border-dashed border-gray-300">
                                        <span className="text-gray-400 font-bold text-sm pixel-text">기록이 없습니다.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
