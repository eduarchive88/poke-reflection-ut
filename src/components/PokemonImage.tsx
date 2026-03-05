"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PokemonImageProps {
    id: number;
    name?: string;
    className?: string;
    pixelated?: boolean;
}

/**
 * 포켓몬 이미지를 다양한 소스에서 순차적으로 로드하는 컴포넌트
 * official-artwork -> home -> dream_world -> front_default -> showdown 순으로 시도
 * id가 0이거나 유효하지 않을 경우 몬스터볼 placeholder 표시
 */
export function PokemonImage({ id, name, className, pixelated = false }: PokemonImageProps) {
    // 유효한 포켓몬 ID인지 확인 (1~10000 범위)
    const validId = id && id > 0 ? id : 0;

    // 모든 가능한 이미지 소스 목록 생성
    const getFallbackSources = useCallback((pokemonId: number): string[] => {
        if (!pokemonId || pokemonId <= 0) return [];
        return [
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`,
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${pokemonId}.png`,
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`,
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemonId}.svg`,
        ];
    }, []);

    const sources = getFallbackSources(validId);
    const [imgSrc, setImgSrc] = useState<string>(sources[0] || "");
    const [fallbackIndex, setFallbackIndex] = useState(0);
    const [isError, setIsError] = useState(false);

    // id가 변경될 때 이미지 소스 리셋
    useEffect(() => {
        const newSources = getFallbackSources(validId);
        if (newSources.length > 0) {
            setImgSrc(newSources[0]);
            setFallbackIndex(0);
            setIsError(false);
        } else {
            setIsError(true);
        }
    }, [validId, getFallbackSources]);

    // 이미지 로드 실패 시 다음 소스로 전환
    const handleError = useCallback(() => {
        setFallbackIndex((prevIndex) => {
            const nextIndex = prevIndex + 1;
            const newSources = getFallbackSources(validId);
            if (nextIndex < newSources.length) {
                setImgSrc(newSources[nextIndex]);
                return nextIndex;
            } else {
                setIsError(true);
                return prevIndex;
            }
        });
    }, [validId, getFallbackSources]);

    // 유효하지 않은 ID이거나 모든 소스 실패 시 placeholder 표시
    if (!validId || isError) {
        return (
            <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-white/10 rounded-full">
                    <span className="text-4xl">❓</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
            {imgSrc && (
                <img
                    src={imgSrc}
                    alt={name || `Pokemon ${id}`}
                    className={cn(
                        "w-full h-full object-contain transition-all duration-300",
                        pixelated && "image-render-pixel"
                    )}
                    style={{
                        imageRendering: pixelated ? 'pixelated' : 'auto',
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))"
                    }}
                    onError={handleError}
                    loading="lazy"
                />
            )}
        </div>
    );
}
