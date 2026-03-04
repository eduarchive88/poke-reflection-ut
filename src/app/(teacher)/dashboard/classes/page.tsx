"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Edit2, Trash2, Copy, Check, Presentation, ChevronLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

export default function ClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

    // 수정용 상태
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassData | null>(null);
    const [editName, setEditName] = useState("");
    const [editCode, setEditCode] = useState("");

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchClasses = async (uid: string) => {
        try {
            const q = query(collection(db, "classes"), where("teacherId", "==", uid));
            const querySnapshot = await getDocs(q);
            const classList: ClassData[] = [];
            querySnapshot.forEach((doc) => {
                classList.push({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) });
            });
            setClasses(classList);
        } catch (error) {
            toast.error("학급 정보를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserUid(user.uid);
                fetchClasses(user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim() || !currentUserUid) return;

        const newSessionCode = nanoid(8).toUpperCase();
        try {
            const docRef = await addDoc(collection(db, "classes"), {
                teacherId: currentUserUid,
                className: newClassName.trim(),
                sessionCode: newSessionCode,
                createdAt: serverTimestamp()
            });

            setClasses([...classes, { id: docRef.id, className: newClassName.trim(), sessionCode: newSessionCode }]);
            setNewClassName("");
            setIsDialogOpen(false);
            toast.success("학급이 성공적으로 생성되었습니다.");
        } catch (error) {
            toast.error("학급 생성에 실패했습니다.");
        }
    };

    const handleUpdateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass || !editName.trim() || !editCode.trim()) return;

        try {
            const classRef = doc(db, "classes", editingClass.id);
            await updateDoc(classRef, {
                className: editName.trim(),
                sessionCode: editCode.trim().toUpperCase()
            });

            setClasses(classes.map(c => c.id === editingClass.id ? { ...c, className: editName.trim(), sessionCode: editCode.trim().toUpperCase() } : c));
            setIsEditOpen(false);
            toast.success("학급 정보가 수정되었습니다.");
        } catch (error) {
            toast.error("수정에 실패했습니다.");
        }
    };

    const handleDeleteClass = async (classId: string) => {
        if (!confirm("정말로 이 학급을 삭제하시겠습니까? 학생 명단은 별도로 삭제해야 합니다.")) return;
        try {
            await deleteDoc(doc(db, "classes", classId));
            setClasses(classes.filter(c => c.id !== classId));
            toast.success("학급이 삭제되었습니다.");
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
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
                        <Button className="retro-btn bg-indigo-500 hover:bg-indigo-600 text-white font-black px-6 h-12">
                            새 학급 생성
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

            {loading ? (
                <div className="py-24 text-center text-slate-500 font-medium animate-pulse">데이터를 불러오는 중...</div>
            ) : classes.length === 0 ? (
                <Card className="retro-box bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-12 text-center">
                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/tm-normal.png" className="w-16 h-16 mb-4 filter grayscale opacity-50" style={{ imageRendering: 'pixelated' }} alt="Empty" />
                    <p className="text-xl font-black text-slate-500 dark:text-slate-400 mb-2">아직 등록된 학급이 없습니다.</p>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">상단의 '새 학급 생성' 버튼을 눌러 시작해보세요.</p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="retro-box hover-pixel-lift bg-white dark:bg-slate-800 flex flex-col h-full group relative z-10 p-0 border-[3px] border-black">
                            <div className="retro-box-inner"></div>

                            <CardHeader className="p-5 border-b-[3px] border-black bg-indigo-500 text-white relative">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <CardTitle className="text-2xl font-black tracking-tight truncate drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{cls.className}</CardTitle>
                                        <CardDescription className="text-indigo-200 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" className="w-3 h-3" style={{ imageRendering: 'pixelated' }} alt="Map" />
                                            Management Stage
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="retro-btn h-8 w-8 px-0 bg-white text-black hover:bg-yellow-400 p-1"
                                            onClick={() => {
                                                setEditingClass(cls);
                                                setEditName(cls.className);
                                                setEditCode(cls.sessionCode);
                                                setIsEditOpen(true);
                                            }}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="retro-btn h-8 w-8 px-0 bg-white text-black hover:bg-red-500 hover:text-white p-1"
                                            onClick={() => handleDeleteClass(cls.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-6 bg-slate-50 dark:bg-slate-700 relative z-10">
                                <div className="bg-white dark:bg-slate-800 border-[3px] border-black p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                                    <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest text-center">학생 접속 세션 코드</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <p className="text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                                            {cls.sessionCode}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="retro-btn h-8 w-8 px-0 bg-slate-200 text-black hover:bg-indigo-500 hover:text-white"
                                            onClick={() => copyToClipboard(cls.sessionCode, cls.id)}
                                        >
                                            {copiedId === cls.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="retro-btn h-10 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-2 border-emerald-900 shadow-[2px_2px_0px_#064e3b] text-xs px-2"
                                            onClick={() => router.push(`/dashboard/students?classId=${cls.id}`)}
                                        >
                                            학생 명렬표
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="retro-btn h-10 bg-amber-100 hover:bg-amber-200 text-amber-800 border-2 border-amber-900 shadow-[2px_2px_0px_#78350f] text-xs px-2"
                                            onClick={() => router.push(`/dashboard/status?classId=${cls.id}`)}
                                        >
                                            성찰 현황판
                                        </Button>
                                    </div>
                                    <Button
                                        className="retro-btn w-full h-10 bg-slate-200 hover:bg-slate-300 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] text-xs"
                                        onClick={() => router.push(`/dashboard/logs?classId=${cls.id}`)}
                                    >
                                        통합 로그 리포트 (Excel)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="retro-box sm:max-w-[425px] bg-white dark:bg-slate-800 p-0 overflow-hidden">
                    <div className="bg-yellow-500 p-4 border-b-[3px] border-black flex items-center gap-2">
                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/machobrace.png" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} alt="Brace" />
                        <DialogTitle className="text-xl font-black text-black uppercase italic drop-shadow-[1px_1px_0_rgba(255,255,255,0.5)]">학급 정보 수정</DialogTitle>
                    </div>
                    <div className="p-6 bg-slate-100 dark:bg-slate-700">
                        <DialogDescription className="text-slate-700 dark:text-slate-300 font-bold mb-4 bg-white dark:bg-slate-800 p-3 border-2 border-black shadow-[2px_2px_0px_#000]">
                            학급 이름과 세션 코드를 변경합니다. 세션 코드를 바꾸면 학생들도 바뀐 코드로 접속해야 합니다.
                        </DialogDescription>
                        <form onSubmit={handleUpdateClass}>
                            <div className="grid gap-6 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name" className="text-black dark:text-white font-black ml-1 text-sm">학급 이름</Label>
                                    <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="retro-box-inner bg-white border-[3px] border-black h-12 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-black font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-code" className="text-black dark:text-white font-black ml-1 text-sm">세션 코드 (접속 코드)</Label>
                                    <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="retro-box-inner bg-white border-[3px] border-black h-12 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-black font-mono font-black tracking-widest uppercase" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button type="submit" className="retro-btn w-full h-12 bg-yellow-400 text-black border-[3px] border-black shadow-[4px_4px_0_#000] text-lg hover:bg-yellow-500">정보 업데이트 (UPDATE)</Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

