"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, serverTimestamp, doc, getDoc, increment, runTransaction, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Star, Info, PenTool, ChevronLeft } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";

export const dynamic = 'force-dynamic';

export default function WritePage() {
    const router = useRouter();

    interface PokemonReward {
        id: number;
        name: string;
        koName?: string;
        image: string;
        types: string[];
    }

    interface StudentSession {
        studentId: string;
        classId: string;
        name: string;
    }

    const [content, setContent] = useState("");
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rewardPokemon, setRewardPokemon] = useState<PokemonReward | null>(null);
    const [session, setSession] = useState<StudentSession | null>(null);
    const [hasAlreadyReflected, setHasAlreadyReflected] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const sessionStr = localStorage.getItem("poke_student_session");
            if (!sessionStr) {
                router.push("/login");
                return;
            }
            const parsedSession = JSON.parse(sessionStr);
            setSession(parsedSession);

            // 오늘 이미 작성했는지 확인
            try {
                const studentDoc = await getDoc(doc(db, "students", parsedSession.studentId));
                if (studentDoc.exists()) {
                    const data = studentDoc.data();
                    if (data.lastReflectedAt) {
                        const lastDate = data.lastReflectedAt.toDate().toLocaleDateString();
                        const todayDate = new Date().toLocaleDateString();
                        if (lastDate === todayDate) {
                            setHasAlreadyReflected(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Status check error:", error);
            } finally {
                setIsLoadingStatus(false);
            }
        };

        checkStatus();
    }, [router]);

    const wordCount = content.trim() === "" ? 0 : content.trim().length;
    const isReady = wordCount >= 70 && rating > 0 && !hasAlreadyReflected;

    const handleSubmit = async () => {
        if (!isReady || isSubmitting || !session) return;

        setIsSubmitting(true);
        try {
            // 0. 학생 정보 재확인 (중복 방지 - 서버 시간 사용)
            const timeRes = await fetch('/api/time');
            const timeData = await timeRes.json();
            const serverToday = timeData.date; // YYYY-MM-DD 형식 (루트에서 처리한 형식)

            const studentRef = doc(db, "students", session.studentId);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const data = studentSnap.data();
                if (data.lastReflectedAt) {
                    const lastDate = data.lastReflectedAt.toDate().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        timeZone: 'Asia/Seoul'
                    }).replace(/\. /g, '-').replace(/\./g, '');
                    
                    if (lastDate === serverToday) {
                        toast.error("이미 오늘은 성찰 일기를 작성했습니다.");
                        setHasAlreadyReflected(true);
                        setIsSubmitting(false);
                        return;
                    }
                }
            }

            // 1. 랜덤 포켓몬 결정 및 데이터 가져오기 (실패 가능성이 있는 외부 API 호출 먼저)
            const randomPokeId = Math.floor(Math.random() * 151) + 1;
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomPokeId}`);
            if (!response.ok) throw new Error("포켓몬 정보를 가져오는데 실패했습니다.");
            const pokeData = await response.json();

            const { POKEMON_KR_NAMES, getPokemonStats, getRandomSkills } = await import("@/lib/pokemonData");
            const koName = POKEMON_KR_NAMES[randomPokeId] || pokeData.name;
            const types = pokeData.types.map((t: { type: { name: string } }) => t.type.name);
            const initialStats = getPokemonStats(randomPokeId, 5);
            const initialSkills = getRandomSkills(types);

            const pokemon: PokemonReward = {
                id: randomPokeId,
                name: pokeData.name,
                koName: koName,
                image: pokeData.sprites.other["official-artwork"]?.front_default ||
                    pokeData.sprites.other["home"]?.front_default ||
                    pokeData.sprites.other["dream_world"]?.front_default ||
                    pokeData.sprites.front_default,
                types: types
            };

            const earnedCandies = Math.max(1, Math.floor(wordCount / 50));

            // 주간 성찰 횟수 확인 및 보너스 캔디 로직
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);

            const weeklyQuery = query(
                collection(db, "reflections"),
                where("studentId", "==", session.studentId)
            );
            const weeklySnap = await getDocs(weeklyQuery);
            let countThisWeek = 0;
            weeklySnap.forEach(d_ => {
                const d = d_.data();
                if (d.createdAt && d.createdAt.toDate() >= monday) {
                    countThisWeek++;
                }
            });
            const isWeeklyAchieved = (countThisWeek === 2); // 현재 작성이 3회째인 경우
            const bonusCandies = isWeeklyAchieved ? 10 : 0;
            const totalCandies = earnedCandies + bonusCandies;

            // Firestore runTransaction을 사용하여 모든 작업을 원자적으로 처리
            await runTransaction(db, async (transaction) => {
                // 1. 포켓몬 지급 또는 레벨업 확인
                const inventoryRef = doc(db, "pokemon_inventory", `${session.studentId}_${randomPokeId}`);
                const existing = await transaction.get(inventoryRef);

                // 2. 성찰 일기 저장 준비
                const reflectionRef = doc(collection(db, "reflections"));
                transaction.set(reflectionRef, {
                    studentId: session.studentId,
                    classId: session.classId,
                    content: content.trim(),
                    wordCount: wordCount,
                    participationRating: rating,
                    earnedCandies: earnedCandies,
                    bonusCandies: bonusCandies,
                    createdAt: serverTimestamp(),
                });

                // 3. 학생 정보 업데이트 (캔디 누적 및 마지막 작성일 갱신)
                transaction.update(studentRef, {
                    candies: increment(totalCandies),
                    lastReflectedAt: serverTimestamp(),
                    reflectionCount: increment(1)
                });

                // 4. 포켓몬 지급 또는 레벨업 실행
                if (existing.exists()) {
                    const currentData = existing.data();
                    transaction.update(inventoryRef, {
                        level: (currentData.level || 5) + 1,
                        updatedAt: serverTimestamp()
                    });

                    // 학생 활동 로그 기록 (레벨업)
                    const logRef = doc(collection(db, "student_logs"));
                    transaction.set(logRef, {
                        studentId: session.studentId,
                        classId: session.classId,
                        type: "level_up",
                        title: `${koName} 레벨업! ✨`,
                        description: `성찰 일기 보상으로 ${koName}의 레벨이 ${currentData.level + 1}로 올랐습니다.`,
                        details: {
                            pokemonId: randomPokeId,
                            newLevel: currentData.level + 1
                        },
                        createdAt: serverTimestamp()
                    });
                } else {
                    const { getPokemonStats, getRandomSkills } = await import("@/lib/pokemonData");
                    const initialStats = getPokemonStats(randomPokeId, 5);
                    const initialSkills = getRandomSkills(types);

                    transaction.set(inventoryRef, {
                        studentId: session.studentId,
                        pokemonId: randomPokeId,
                        name: pokeData.name,
                        koName: koName,
                        image: pokemon.image,
                        types: types,
                        level: 5,
                        exp: 0,
                        stats: initialStats,
                        skills: initialSkills,
                        createdAt: serverTimestamp()
                    });

                    // 학생 활동 로그 기록 (새로운 포켓몬)
                    const logRef = doc(collection(db, "student_logs"));
                    transaction.set(logRef, {
                        studentId: session.studentId,
                        classId: session.classId,
                        type: "pokemon_catch",
                        title: `새로운 친구 ${koName}! 🎈`,
                        description: `성찰 일기 보상으로 새로운 포켓몬 ${koName}을 얻었습니다.`,
                        details: {
                            pokemonId: randomPokeId,
                            level: 5
                        },
                        createdAt: serverTimestamp()
                    });
                }

                // 성찰 일기 작성 로그
                const reflectionLogRef = doc(collection(db, "student_logs"));
                transaction.set(reflectionLogRef, {
                    studentId: session.studentId,
                    classId: session.classId,
                    type: "reflection",
                    title: "성찰 일기 작성 완료 📝",
                    description: `오늘의 성찰 일기를 작성했습니다. (${wordCount}자)`,
                    details: {
                        wordCount: wordCount,
                        rating: rating
                    },
                    createdAt: serverTimestamp()
                });

                // 캔디 획득 로그
                const candyLogRef = doc(collection(db, "student_logs"));
                transaction.set(candyLogRef, {
                    studentId: session.studentId,
                    classId: session.classId,
                    type: "candy_gain",
                    title: isWeeklyAchieved ? `주간 목표 달성! 캔디 ${totalCandies}개 획득! 🍬` : `캔디 ${totalCandies}개 획득! 🍬`,
                    description: isWeeklyAchieved
                        ? `성찰 일기 주 3회 작성 보너스로 10개 추가! 총 ${totalCandies}개를 받았습니다.`
                        : `성찰 일기 작성 보상으로 캔디 ${totalCandies}개를 받았습니다.`,
                    details: {
                        amount: totalCandies,
                        reason: isWeeklyAchieved ? "weekly_bonus" : "reflection"
                    },
                    createdAt: serverTimestamp()
                });
            });

            setRewardPokemon(pokemon);
            setHasAlreadyReflected(true);
            toast.success(isWeeklyAchieved ? `주간 목표 달성! 보너스 포함 ${totalCandies}개의 캔디를 획득했습니다!` : `${totalCandies}개의 캔디를 획득했습니다! 성찰 일기가 저장되었습니다.`);
        } catch (error) {
            console.error(error);
            toast.error("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-full hover:bg-slate-800/50"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                            <PenTool className="h-8 w-8" />
                            오늘의 성찰
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            오늘 수업 참여도를 평가하고 배운 점을 기록해보세요.
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {rewardPokemon ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                    >
                        <Card className="w-full max-w-sm overflow-hidden border-2 border-primary shadow-2xl">
                            <CardHeader className="text-center bg-primary/10 pb-2">
                                <CardTitle className="text-2xl font-black text-primary flex items-center justify-center gap-2">
                                    <Sparkles className="h-6 w-6" />
                                    새로운 친구 발견!
                                </CardTitle>
                                <CardDescription>성찰 일기를 작성하여 포켓몬을 얻었습니다!</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center py-8">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500"></div>
                                    <PokemonImage
                                        id={rewardPokemon.id}
                                        name={rewardPokemon.name}
                                        className="w-48 h-48 relative z-10 animate-bounce"
                                    />
                                </div>
                                <h3 className="text-3xl font-bold mt-4 capitalize">{rewardPokemon.koName || rewardPokemon.name}</h3>
                                <div className="flex gap-2 mt-2">
                                    {rewardPokemon.types.map((type: string) => (
                                        <span key={type} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold uppercase">{type}</span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button className="w-full" onClick={() => router.push("/student/pokedex")}>도감에서 확인하기</Button>
                                <Button variant="ghost" className="w-full" onClick={() => {
                                    setRewardPokemon(null);
                                    setContent("");
                                }}>닫기</Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ) : null}
            </AnimatePresence>


            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" /> 알아두면 좋은 성찰 가이드
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                        <li>오늘 수업 활동에서 알게된 것과 더 알고 싶은 것은 무엇인가요?</li>
                        <li>오늘 배운 내용을 나의 삶에 어떻게 적용할 수 있을까요?</li>
                        <li>친구들과의 소통이나 협력 과정 중 기억에 남는 것은 무엇인가요?</li>
                        <li>오늘 활동을 통해 느낀 점을 자유롭게 적어보세요.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="border-2 overflow-hidden shadow-lg">
                <CardHeader className="pb-4 bg-muted/30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg">수업 참여도 평가</CardTitle>
                            <CardDescription>오늘 나의 노력은 몇 점인가요?</CardDescription>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => !hasAlreadyReflected && setRating(star)}
                                    className={`p-1 transition-all ${rating >= star ? 'text-yellow-400 scale-110' : 'text-muted-foreground/20 hover:scale-105'} ${hasAlreadyReflected ? 'cursor-not-allowed opacity-50' : ''}`}
                                    disabled={hasAlreadyReflected}
                                >
                                    <Star className={`h-10 w-10 ${rating >= star ? 'fill-current' : ''}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {hasAlreadyReflected ? (
                        <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl p-8 text-center space-y-4 animate-pulse">
                            <Info className="h-12 w-12 text-amber-500 mx-auto" />
                            <h3 className="text-xl font-bold text-amber-600">오늘의 성찰을 이미 마쳤습니다!</h3>
                            <p className="text-muted-foreground">내일 다시 새로운 포켓몬을 만나러 오세요.</p>
                        </div>
                    ) : (
                        <>
                            <Textarea
                                placeholder="오늘 무엇을 배웠나요? 즐거웠던 일이나 반성할 점은 무엇인가요? (상단 가이드 질문을 참고하여 70자 이상 작성해주세요)"
                                className="min-h-[300px] text-lg leading-relaxed focus-visible:ring-primary border-2 rounded-2xl"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting || hasAlreadyReflected}
                            />
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm font-medium">
                                <div className="flex flex-col gap-1 w-full sm:w-auto">
                                    <span className={`inline-flex items-center whitespace-nowrap ${wordCount >= 70 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                        📝 글자 수: <span className="text-lg mx-1">{wordCount}</span> / 70자 이상
                                    </span>
                                    <span className={`inline-flex items-center whitespace-nowrap ${rating > 0 ? "text-yellow-600 font-bold" : "text-muted-foreground"}`}>
                                        ⭐ 참여도 별점: {rating > 0 ? <span className="ml-1">{rating}점 선택됨</span> : <span className="ml-1 text-slate-400 font-normal italic">미선택</span>}
                                    </span>
                                </div>
                                {isReady ? (
                                    <div className="text-green-600 flex items-center gap-1 animate-pulse bg-green-500/10 px-4 py-2 rounded-full border-2 border-green-500/20 whitespace-nowrap">
                                        <Sparkles className="h-4 w-4 shrink-0" /> 보상 획득 가능!
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full flex items-center gap-2 border whitespace-nowrap">
                                        <Info className="h-4 w-4 shrink-0" />
                                        <span>{rating === 0 ? "별점을 먼저 선택해주세요" : (wordCount < 70 ? "내용을 조금 더 적어주세요" : "")}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="border-t bg-muted/20 pt-6">
                    <Button
                        size="lg"
                        className={`w-full text-xl h-16 rounded-2xl font-black shadow-lg transition-all ${isReady ? 'hover:scale-[1.02] active:scale-95' : ''}`}
                        disabled={!isReady || isSubmitting || hasAlreadyReflected}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                포켓몬을 부르는 중...
                            </>
                        ) : hasAlreadyReflected ? (
                            <>작성 완료 (내일 새로운 포켓몬을 만나러 오세요)</>
                        ) : (
                            <>기록 완료하고 보상 받기</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
