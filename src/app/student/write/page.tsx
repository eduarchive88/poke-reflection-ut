"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

export default function WriteReflectionPage() {
    const router = useRouter();

    interface PokemonReward {
        id: number;
        name: string;
        image: string;
        types: string[];
    }

    interface StudentSession {
        studentId: string;
        classId: string;
        name: string;
    }

    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rewardPokemon, setRewardPokemon] = useState<PokemonReward | null>(null);
    const [session, setSession] = useState<StudentSession | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        setSession(JSON.parse(sessionStr));
    }, [router]);

    const wordCount = content.trim() === "" ? 0 : content.trim().length;
    const isReady = wordCount >= 10; // 최소 10자 이상 작성 권장 (스펙에 따라 조절 가능)

    const handleSubmit = async () => {
        if (!isReady || isSubmitting || !session) return;

        setIsSubmitting(true);
        try {
            // 1. 성찰 일기 저장
            await addDoc(collection(db, "reflections"), {
                studentId: session.studentId,
                classId: session.classId,
                content: content.trim(),
                wordCount: wordCount,
                createdAt: serverTimestamp()
            });

            // 2. 랜덤 포켓몬 결정 (1~151번 중 하나)
            const randomPokeId = Math.floor(Math.random() * 151) + 1;

            // PokeAPI로부터 정보 가져오기 (이미지 및 이름 가공)
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomPokeId}`);
            const pokeData = await response.json();

            const pokemon: PokemonReward = {
                id: randomPokeId,
                name: pokeData.name, // 한글 이름은 나중에 매핑 테이블 추가 필요 (PokeAPI는 영어 위주)
                image: pokeData.sprites.other["official-artwork"].front_default || pokeData.sprites.front_default,
                types: pokeData.types.map((t: { type: { name: string } }) => t.type.name)
            };

            // 3. 인벤토리에 추가 (중복 획득 시 레벨업 혹은 중복 보유 로직 필요, 일단 추가)
            // Document ID: studentId_pokemonId 조합으로 고유성 유지 시도하거나 자동 생성
            const inventoryRef = doc(db, "pokemon_inventory", `${session.studentId}_${randomPokeId}`);
            const existing = await getDoc(inventoryRef);

            if (existing.exists()) {
                const currentData = existing.data();
                await setDoc(inventoryRef, {
                    ...currentData,
                    level: (currentData.level || 5) + 1, // 중복 획득 시 레벨업 보너스
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } else {
                await setDoc(inventoryRef, {
                    studentId: session.studentId,
                    pokemonId: randomPokeId,
                    name: pokemon.name,
                    image: pokemon.image,
                    types: pokemon.types,
                    level: 5,
                    exp: 0,
                    createdAt: serverTimestamp()
                });
            }

            setRewardPokemon(pokemon);
            toast.success("성찰 일기가 저장되었습니다!");
        } catch (error) {
            console.error(error);
            toast.error("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
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
                                    <img
                                        src={rewardPokemon.image}
                                        alt={rewardPokemon.name}
                                        className="w-48 h-48 relative z-10 drop-shadow-xl animate-bounce"
                                    />
                                </div>
                                <h3 className="text-3xl font-bold mt-4 capitalize">{rewardPokemon.name}</h3>
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

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">오늘의 성찰</h2>
                    <p className="text-muted-foreground mt-1">
                        오늘 있었던 특별한 일을 기록해보세요.
                    </p>
                </div>
            </div>

            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="text-lg">나의 이야기</CardTitle>
                    <CardDescription>
                        진심을 담아 10자 이상 작성하면 새로운 포켓몬이 찾아옵니다!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="오늘 무엇을 배웠나요? 즐거웠던 일이나 반성할 점은 무엇인가요?"
                        className="min-h-[300px] text-lg leading-relaxed focus-visible:ring-primary"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className={wordCount >= 10 ? "text-primary" : "text-muted-foreground"}>
                            현재 글자 수: <span className="text-lg">{wordCount}</span> / 10자 이상
                        </span>
                        {isReady && <span className="text-green-500 flex items-center gap-1 animate-pulse"><Sparkles className="h-4 w-4" /> 보상 획득 가능!</span>}
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-secondary/10 pt-6">
                    <Button
                        size="lg"
                        className="w-full text-lg h-14"
                        disabled={!isReady || isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                포켓몬을 부르는 중...
                            </>
                        ) : (
                            <>기록 완료하고 보상 받기</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
