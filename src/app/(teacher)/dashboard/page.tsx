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
import { Edit2, Trash2, Copy, Check } from "lucide-react";

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">학급 관리</h2>
                    <p className="text-muted-foreground mt-2">
                        선생님의 학급 및 접속 세션 코드를 관리하세요.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>새 학급 생성</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>새 학급 생성</DialogTitle>
                            <DialogDescription>
                                학급 이름(예: 1학년 1반)을 입력하세요. 접속용 세션 코드가 자동으로 발급됩니다.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateClass}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        학급 이름
                                    </Label>
                                    <Input
                                        id="name"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="예: 3학년 2반"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">생성하기</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
            ) : classes.length === 0 ? (
                <Card className="border-dashed bg-secondary/30">
                    <CardContent className="flex flex-col items-center justify-center h-48 text-center px-4">
                        <p className="text-muted-foreground">아직 등록된 학급이 없습니다.</p>
                        <p className="text-sm text-muted-foreground mt-1">상단의 &apos;새 학급 생성&apos; 버튼을 눌러 시작해보세요.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="relative group overflow-hidden border-2 hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{cls.className}</CardTitle>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground"
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
                                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleDeleteClass(cls.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>모험의 무대</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-secondary/50 rounded-md p-3 mb-4 mt-2 relative">
                                    <p className="text-xs text-muted-foreground mb-1">학생 접속 세션 코드 (복사 및 공유)</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <p className="text-lg font-mono font-bold tracking-widest text-primary my-1 select-all">
                                            {cls.sessionCode}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => copyToClipboard(cls.sessionCode, cls.id)}
                                        >
                                            {copiedId === cls.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="text-xs font-bold" onClick={() => router.push(`/dashboard/students?classId=${cls.id}`)}>
                                            학생 명렬표
                                        </Button>
                                        <Button variant="default" className="text-xs font-bold" onClick={() => router.push(`/dashboard/status?classId=${cls.id}`)}>
                                            성찰 현황판
                                        </Button>
                                    </div>
                                    <Button variant="secondary" className="text-xs font-bold w-full" onClick={() => router.push(`/dashboard/logs?classId=${cls.id}`)}>
                                        전체 로그 다운로드 (Excel)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>학급 정보 수정</DialogTitle>
                        <DialogDescription>
                            학급 이름과 세션 코드를 변경합니다. 세션 코드를 바꾸면 학생들도 바뀐 코드로 접속해야 합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateClass}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">학급 이름</Label>
                                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-code" className="text-right">세션 코드</Label>
                                <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="col-span-3 font-mono font-bold" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">저장하기</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
