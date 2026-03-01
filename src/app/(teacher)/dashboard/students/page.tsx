"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function StudentsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-medium animate-pulse">로딩 중...</div>}>
            <StudentsContent />
        </Suspense>
    );
}

interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

interface StudentData {
    id: string;
    grade: number;
    classNum: number;
    number: number;
    name: string;
    classId: string;
}

function StudentsContent() {
    const searchParams = useSearchParams();
    const urlClassId = searchParams.get("classId");

    const [classes, setClasses] = useState<ClassData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
                const snapshots = await getDocs(q);
                const classList: ClassData[] = [];
                snapshots.forEach((doc) => classList.push({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) }));
                setClasses(classList);

                // URL 파라미터가 있으면 우선 적용, 없으면 첫 번째 학급
                if (urlClassId) {
                    setSelectedClassId(urlClassId);
                } else if (classList.length > 0) {
                    setSelectedClassId(classList[0].id);
                }
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [urlClassId]);

    useEffect(() => {
        if (selectedClassId) {
            fetchStudents(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchStudents = async (classId: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshots = await getDocs(q);
            const studentList: StudentData[] = [];
            snapshots.forEach((doc) => studentList.push({ id: doc.id, ...(doc.data() as Omit<StudentData, "id">) }));

            studentList.sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade;
                if (a.classNum !== b.classNum) return a.classNum - b.classNum;
                return a.number - b.number;
            });

            setStudents(studentList);
        } catch (error) {
            toast.error("학생 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFile(e.target.files[0]);
        }
    };

    const processExcelAndUpload = async () => {
        if (!uploadFile) {
            toast.error("엑셀 파일을 선택해주세요.");
            return;
        }
        if (!selectedClassId) {
            toast.error("학급을 먼저 선택해주세요.");
            return;
        }

        const targetClass = classes.find(c => c.id === selectedClassId);
        if (!targetClass) return;

        setUploading(true);
        try {
            const data = await uploadFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                toast.error("업로드된 엑셀 파일에 데이터가 없습니다.");
                setUploading(false);
                return;
            }

            const batch = writeBatch(db);
            let count = 0;

            interface ExcelRow {
                "학년"?: string | number;
                "grade"?: string | number;
                "반"?: string | number;
                "classNum"?: string | number;
                "class"?: string | number;
                "번호"?: string | number;
                "number"?: string | number;
                "이름"?: string;
                "name"?: string;
            }

            for (const row of jsonData as ExcelRow[]) {
                const grade = parseInt(String(row["학년"] || row["grade"] || 0));
                const classNum = parseInt(String(row["반"] || row["classNum"] || row["class"] || 0));
                const number = parseInt(String(row["번호"] || row["number"] || 0));
                const name = row["이름"] || row["name"] || "";

                if (grade && classNum && number && name) {
                    const sessionCode = targetClass.sessionCode;
                    const docId = `${sessionCode}_${grade}_${classNum}_${number}`;
                    const studentRef = doc(collection(db, "students"), docId);

                    batch.set(studentRef, {
                        classId: selectedClassId,
                        grade,
                        classNum,
                        number,
                        name,
                        createdAt: serverTimestamp()
                    }, { merge: true });

                    count++;
                }
            }

            if (count > 0) {
                await batch.commit();
                toast.success(`${count}명의 학생 배치가 완료/갱신 되었습니다.`);
                setIsUploadOpen(false);
                setUploadFile(null);
                fetchStudents(selectedClassId);
            } else {
                toast.error("올바른 컬럼(학년, 반, 번호, 이름) 양식을 찾을 수 없습니다.");
            }

        } catch (error) {
            console.error(error);
            toast.error("엑셀 처리 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">학생 명렬표</h2>
                    <p className="text-muted-foreground mt-2">
                        학급별 학생 명단을 확인하고 엑셀로 일괄 등록하세요.
                    </p>
                </div>

                {classes.length > 0 && (
                    <div className="flex items-center gap-4">
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="학급 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>{cls.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                                <Button variant="default" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    일괄 등록
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>엑셀 명렬표 업로드</DialogTitle>
                                    <DialogDescription>
                                        &quot;학년&quot;, &quot;반&quot;, &quot;번호&quot;, &quot;이름&quot; 열이 포함된 .xlsx 또는 .csv 파일을 선택해주세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="file" className="w-[80px] text-right">
                                            파일 선택
                                        </Label>
                                        <Input
                                            id="file"
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            className="flex-1"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={processExcelAndUpload} disabled={!uploadFile || uploading}>
                                        {uploading ? "업로드 중..." : "등록하기"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{classes.find(c => c.id === selectedClassId)?.className || "학급 미지정"}</CardTitle>
                    <CardDescription>총 학생 수: {students.length}명</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-6 text-muted-foreground">목록 갱신 중...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-secondary/20">
                            명단이 비어있습니다.
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px] text-center">학년</TableHead>
                                        <TableHead className="w-[100px] text-center">반</TableHead>
                                        <TableHead className="w-[100px] text-center">번호</TableHead>
                                        <TableHead>이름</TableHead>
                                        <TableHead className="text-right">상태</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="text-center font-medium">{student.grade}</TableCell>
                                            <TableCell className="text-center">{student.classNum}</TableCell>
                                            <TableCell className="text-center">{student.number}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-sm">연동됨</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// 페이지 하단 중복 제거
