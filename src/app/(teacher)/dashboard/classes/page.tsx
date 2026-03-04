"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Check, Trash2, Copy, ChevronLeft, Plus } from "lucide-react";
import { useTeacherClass } from "@/contexts/TeacherClassContext";
import { auth } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export default function ClassesPage() {
    const router = useRouter();
    const { classes, selectedClassId, setSelectedClassId, loadingClasses, refreshClasses } = useTeacherClass();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState("");

    // 수정용 상태 (인라인 편집)
    const [editName, setEditName] = useState("");
    const [editCode, setEditCode] = useState("");

    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 선택 학급이 변경되면 editName/editCode를 자동으로 현재 학급 정보로 초기화
    const selectedClassData = classes.find(c => c.id === selectedClassId);
    useEffect(() => {
        if (selectedClassData) {
            setEditName(selectedClassData.className);
            setEditCode(selectedClassData.sessionCode);
        }
    }, [selectedClassId, selectedClassData?.className, selectedClassData?.sessionCode]);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentUserUid = auth.currentUser?.uid;
        if (!newClassName.trim() || !currentUserUid) return;

        const newSessionCode = nanoid(8).toUpperCase();
        try {
            const docRef = await addDoc(collection(db, "classes"), {
                teacherId: currentUserUid,
                className: newClassName.trim(),
                sessionCode: newSessionCode,
                createdAt: serverTimestamp()
            });

            await refreshClasses(); // 전역 상태 갱신
            setSelectedClassId(docRef.id); // 방금 생성한 학급으로 바로 선택 변경
            setNewClassName("");
            setIsDialogOpen(false);
            toast.success("학급이 성공적으로 생성되었습니다.");
        } catch (error) {
            toast.error("학급 생성에 실패했습니다.");
        }
    };

    // 학급 정보 업데이트 (인라인 저장 버튼 클릭 시 직접 호출)
    const handleUpdateClass = async () => {
        if (!selectedClassId || !editName.trim() || !editCode.trim()) return;

        try {
            const classRef = doc(db, "classes", selectedClassId);
            await updateDoc(classRef, {
                className: editName.trim(),
                sessionCode: editCode.trim().toUpperCase()
            });

            await refreshClasses(); // 변경사항 전역 상태 갱신
            toast.success("학급 정보가 수정되었습니다.");
        } catch (error) {
            toast.error("수정에 실패했습니다.");
        }
    };

    const handleDeleteClass = async () => {
        if (!selectedClassId) return;
        if (!confirm("정말로 이 학급을 삭제하시겠습니까? 학생 명단은 별도로 삭제해야 합니다.")) return;
        try {
            await deleteDoc(doc(db, "classes", selectedClassId));
            await refreshClasses(); // 전역 상태 갱신 (선택된 학급 자동 리셋됨)
            toast.success("학급이 삭제되었습니다.");
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
        }
    };

    const copyToClipboard = (text: string) => {
        if (!selectedClassId) return;
        navigator.clipboard.writeText(text);
        setCopiedId(selectedClassId);
        toast.info("세션 코드가 복사되었습니다.");
        setTimeout(() => setCopiedId(null), 2000);
    };



    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="retro-btn w-10 h-10 px-0 flex items-center justify-center bg-white text-black hover:bg-slate-200"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-1">
                        <h2 className="text-3xl sm:text-4xl font-black italic drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)] text-black dark:text-white">학급 관리</h2>
                        <p className="text-slate-500 font-bold tracking-tight text-xs uppercase flex items-center gap-1">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/up-grade.png" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} alt="PC" />
                            Class & Session Management
                        </p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="retro-btn bg-indigo-500 hover:bg-indigo-600 text-white font-black px-4 sm:px-6 h-12 flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">새 학급 만들기</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="retro-box sm:max-w-[425px] bg-white dark:bg-slate-800 p-0 overflow-hidden">
                        <div className="bg-indigo-600 p-4 border-b-[3px] border-black flex items-center gap-2">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/exp-candys.png" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} alt="Candy" />
                            <DialogTitle className="text-xl font-black text-white uppercase italic drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">새 학급 생성</DialogTitle>
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-700">
                            <DialogDescription className="text-slate-700 dark:text-slate-300 font-bold mb-4 bg-white dark:bg-slate-800 p-3 border-2 border-black shadow-[2px_2px_0px_#000]">
                                학급 이름을 입력하세요. 접속용 세션 코드가 자동으로 발급됩니다.
                            </DialogDescription>
                            <form onSubmit={handleCreateClass}>
                                <div className="grid gap-6 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-black dark:text-white font-black ml-1 text-sm">학급 이름</Label>
                                        <Input
                                            id="name"
                                            value={newClassName}
                                            onChange={(e) => setNewClassName(e.target.value)}
                                            className="retro-box-inner bg-white border-[3px] border-black h-12 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-black font-bold"
                                            placeholder="예: 3학년 2반"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button type="submit" className="retro-btn w-full h-12 bg-indigo-500 text-white text-lg hover:bg-indigo-600">생성하기 (CREATE)</Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loadingClasses ? (
                <div className="py-24 text-center text-slate-500 font-medium animate-pulse">상태를 불러오는 중...</div>
            ) : !selectedClassData ? (
                <Card className="retro-box bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-12 text-center">
                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/tm-normal.png" className="w-16 h-16 mb-4 filter grayscale opacity-50" style={{ imageRendering: 'pixelated' }} alt="Empty" />
                    <p className="text-xl font-black text-slate-500 dark:text-slate-400 mb-2">선택된 학급이 없거나, 등록된 학급이 없습니다.</p>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">상단의 메뉴에서 학급을 선택하거나 새 학급을 생성해보세요.</p>
                </Card>
            ) : (
                <div className="max-w-2xl mx-auto">
                    <Card className="retro-box bg-white dark:bg-slate-800 flex flex-col h-full relative z-10 p-0 border-[3px] border-black">

                        {/* 카드 헤더: 학급 이름 인라인 편집 */}
                        <CardHeader className="p-6 border-b-[3px] border-black bg-indigo-500 text-white">
                            <CardDescription className="text-indigo-200 font-bold text-xs uppercase tracking-widest flex items-center gap-1 mb-3">
                                <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} alt="Map" />
                                학급 이름 (클릭하여 바로 수정 가능)
                            </CardDescription>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-2xl font-black bg-white/20 border-[3px] border-white/60 text-white placeholder:text-indigo-300 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-14"
                                placeholder="학급 이름 입력..."
                            />
                        </CardHeader>

                        <CardContent className="p-8 flex flex-col space-y-6 bg-slate-50 dark:bg-slate-700">
                            {/* 세션 코드 인라인 편집 Section */}
                            <div className="bg-white dark:bg-slate-800 border-[3px] border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" className="w-32 h-32" style={{ imageRendering: 'pixelated' }} alt="BG" />
                                </div>
                                <p className="text-sm font-black text-slate-500 mb-1 uppercase tracking-widest">학생 접속 세션 코드</p>
                                <p className="text-xs font-bold text-amber-600 bg-amber-50 border-2 border-amber-300 p-2 mb-3">
                                    ⚠️ 코드를 바꾸면 학생들도 변경된 코드로 다시 접속해야 합니다.
                                </p>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={editCode}
                                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                        className="flex-1 text-2xl font-black font-mono tracking-widest text-indigo-600 text-center bg-slate-100 dark:bg-slate-900 border-[3px] border-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-16 uppercase"
                                        placeholder="세션 코드"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="retro-btn h-16 w-16 px-0 bg-indigo-50 text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-500 hover:text-white shadow-[2px_2px_0px_#4f46e5]"
                                        onClick={() => copyToClipboard(editCode)}
                                        title="코드 복사"
                                    >
                                        {copiedId === selectedClassId ? <Check className="h-8 w-8" /> : <Copy className="h-8 w-8" />}
                                    </Button>
                                </div>
                            </div>

                            {/* 저장 + 삭제 버튼 */}
                            <div className="grid sm:grid-cols-2 gap-4 pt-2">
                                <Button
                                    className="retro-btn h-14 bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-black shadow-[4px_4px_0px_#000] text-base font-black flex items-center justify-center gap-2"
                                    onClick={handleUpdateClass}
                                    disabled={!editName.trim() || !editCode.trim()}
                                >
                                    <Check className="w-5 h-5" />
                                    변경 저장하기 (SAVE)
                                </Button>
                                <Button
                                    variant="outline"
                                    className="retro-btn h-14 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border-2 border-red-900 shadow-[2px_2px_0px_#7f1d1d] text-sm font-black flex items-center justify-center gap-2 transition-colors"
                                    onClick={() => handleDeleteClass()}
                                >
                                    <Trash2 className="w-5 h-5" />
                                    이 학급 삭제하기
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

