"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PokemonImageProps {
    id: number;
    name?: string;
    className?: string;
    pixelated?: boolean;
}

/**
 * 포켓몬 이미지를 다양한 소스에서 순차적으로 로드하는 컴포넌트
 * official-artwork -> home -> dream_world -> front_default 순으로 시도
 */
export function PokemonImage({ id, name, className, pixelated = false }: PokemonImageProps) {
    const [imgSrc, setImgSrc] = useState<string>("");
    const [fallbackIndex, setFallbackIndex] = useState(0);

    const fallbackSources = [
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${id}.svg`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    ];

    useEffect(() => {
        setImgSrc(fallbackSources[0]);
        setFallbackIndex(0);
    }, [id]);

    const handleError = () => {
        if (fallbackIndex < fallbackSources.length - 1) {
            const nextIndex = fallbackIndex + 1;
            setFallbackIndex(nextIndex);
            setImgSrc(fallbackSources[nextIndex]);
        }
    };

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
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))"
                    }}
                    onError={handleError}
                />
            )}
        </div>
    );
}
