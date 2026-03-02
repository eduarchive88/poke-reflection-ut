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
import { Edit2, Trash2, Copy, Check, Presentation } from "lucide-react";

export const dynamic = 'force-dynamic';

interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

export default function DashboardPage() {
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter pokemon-gradient-text">학급 관리</h2>
                    <p className="text-slate-400 font-bold tracking-tight">
                        선생님의 학급 및 접속 세션 코드를 관리하세요.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#ff0000] hover:bg-[#cc0000] text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-[#ff0000]/20 transition-all hover:scale-105 active:scale-95 border-2 border-[#3b4cca]">
                            새 학급 생성
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-[#001233] border-2 border-[#3b4cca]/40 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black pokemon-gradient-text uppercase italic">새 학급 생성</DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold">
                                학급 이름을 입력하세요. 접속용 세션 코드가 자동으로 발급됩니다.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateClass}>
                            <div className="grid gap-6 py-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300 font-bold ml-1">학급 이름</Label>
                                    <Input
                                        id="name"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="bg-[#0a285f]/50 border-[#3b4cca]/50 h-12 rounded-xl focus:ring-[#ffde00]"
                                        placeholder="예: 3학년 2반"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full h-12 bg-[#ffde00] text-[#3b4cca] font-black rounded-xl hover:bg-[#ffcb05]">생성하기</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="py-24 text-center text-slate-500 font-medium animate-pulse">시스템 데이터 로딩 중...</div>
            ) : classes.length === 0 ? (
                <Card className="premium-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center px-4">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                            <Presentation className="h-10 w-10 text-slate-600" />
                        </div>
                        <p className="text-xl font-bold text-slate-300">아직 등록된 학급이 없습니다.</p>
                        <p className="text-slate-500 mt-2">상단의 &apos;새 학급 생성&apos; 버튼을 눌러 모험을 시작해보세요.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="premium-card relative group overflow-hidden flex flex-col h-full rounded-3xl">
                            {/* Card Accent Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffde00]/5 rounded-full blur-3xl group-hover:bg-[#ffde00]/10 transition-all duration-500"></div>

                            <CardHeader className="pb-4 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-black text-slate-100 tracking-tight">{cls.className}</CardTitle>
                                        <CardDescription className="text-[#ffde00]/70 font-bold text-xs uppercase tracking-widest">Adventure Stage</CardDescription>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 bg-slate-800/50 text-slate-300 hover:text-amber-400 rounded-xl"
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
                                            className="h-9 w-9 bg-slate-800/50 text-slate-300 hover:text-red-400 rounded-xl"
                                            onClick={() => handleDeleteClass(cls.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between relative z-10 space-y-6">
                                <div className="bg-[#0a285f]/40 border-2 border-[#3b4cca]/30 rounded-2xl p-5 group/code transition-all hover:border-[#ffde00]/30 shadow-inner">
                                    <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest text-center">학생 접속 세션 코드</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <p className="text-2xl font-black font-mono tracking-[0.2em] text-[#ffde00] select-all drop-shadow-[0_0_5px_rgba(255,222,0,0.3)]">
                                            {cls.sessionCode}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 bg-[#001233]/50 group-hover/code:bg-[#ffde00]/10 rounded-xl transition-all"
                                            onClick={() => copyToClipboard(cls.sessionCode, cls.id)}
                                        >
                                            {copiedId === cls.id ? <Check className="h-5 w-5 text-[#ffde00]" /> : <Copy className="h-5 w-5 text-slate-400 transition-colors group-hover/code:text-[#ffde00]" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="ghost"
                                            className="h-12 bg-[#0a285f]/40 hover:bg-[#3b4cca]/20 text-slate-200 font-bold rounded-2xl border-2 border-[#3b4cca]/20"
                                            onClick={() => router.push(`/dashboard/students?classId=${cls.id}`)}
                                        >
                                            학생 명렬표
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="h-12 bg-[#ffde00]/10 hover:bg-[#ffde00]/20 text-[#ffde00] font-bold rounded-2xl border-2 border-[#ffde00]/20"
                                            onClick={() => router.push(`/dashboard/status?classId=${cls.id}`)}
                                        >
                                            성찰 현황판
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="w-full h-12 bg-[#ff0000]/5 hover:bg-[#ff0000]/10 text-[#ff0000] font-bold rounded-2xl border-2 border-[#ff0000]/10"
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
                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 rounded-3xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-100 gold-gradient-text uppercase">학급 정보 수정</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">
                            학급 이름과 세션 코드를 변경합니다. 세션 코드를 바꾸면 학생들도 바뀐 코드로 접속해야 합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateClass}>
                        <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-sm text-slate-400 font-bold ml-1">학급 이름</Label>
                                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-code" className="text-sm text-slate-400 font-bold ml-1">세션 코드 (접속 코드)</Label>
                                <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500 font-mono font-bold tracking-widest uppercase" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="h-14 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95">정보 업데이트</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
