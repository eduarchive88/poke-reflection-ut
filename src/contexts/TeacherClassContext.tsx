"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

interface TeacherClassContextType {
    classes: ClassData[];
    selectedClassId: string | null;
    setSelectedClassId: (id: string | null) => void;
    loadingClasses: boolean;
    refreshClasses: () => Promise<void>;
}

const TeacherClassContext = createContext<TeacherClassContextType>({
    classes: [],
    selectedClassId: null,
    setSelectedClassId: () => { },
    loadingClasses: true,
    refreshClasses: async () => { },
});

export const useTeacherClass = () => useContext(TeacherClassContext);

export const TeacherClassProvider = ({ children }: { children: ReactNode }) => {
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [teacherId, setTeacherId] = useState<string | null>(null);

    const fetchClasses = async (uid: string) => {
        setLoadingClasses(true);
        try {
            const q = query(collection(db, "classes"), where("teacherId", "==", uid));
            const querySnapshot = await getDocs(q);
            const classList: ClassData[] = [];
            querySnapshot.forEach((doc) => {
                classList.push({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) });
            });

            // Sort logic - can be alphabetical by class name
            classList.sort((a, b) => a.className.localeCompare(b.className));

            setClasses(classList);

            // 현재 선택된 학급이 목록에서 사라졌으면 null로 리셋 (학급 삭제된 경우)
            if (selectedClassId && !classList.find(c => c.id === selectedClassId)) {
                setSelectedClassId(null);
            }
            // 자동 선택하지 않음 - 교사가 직접 학급을 선택해야 함
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoadingClasses(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setTeacherId(user.uid);
                fetchClasses(user.uid);
            } else {
                setTeacherId(null);
                setClasses([]);
                setSelectedClassId(null);
                setLoadingClasses(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshClasses = async () => {
        if (teacherId) {
            await fetchClasses(teacherId);
        }
    };

    return (
        <TeacherClassContext.Provider value={{ classes, selectedClassId, setSelectedClassId, loadingClasses, refreshClasses }}>
            {children}
        </TeacherClassContext.Provider>
    );
};
