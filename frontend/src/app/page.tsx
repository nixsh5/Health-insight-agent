"use client"

import React from "react"
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Full-screen background gradient behind content */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <ShaderGradientCanvas
                    style={{ width: "100%", height: "100%" }}
                    pixelDensity={1}
                    pointerEvents="none"
                >
                    <ShaderGradient
                        animate="on"
                        shader="defaults"
                        type="sphere"
                        wireframe={false}
                        uTime={0}
                        uSpeed={0.3}
                        uStrength={0.3}
                        uDensity={0.8}
                        uFrequency={5.5}
                        uAmplitude={3.2}
                        positionX={-0.1}
                        positionY={0}
                        positionZ={0}
                        rotationX={0}
                        rotationY={130}
                        rotationZ={70}
                        color1="#73bfc4"
                        color2="#ff810a"
                        color3="#8da0ce"
                        reflection={0.4}
                        lightType="env"
                        brightness={0.8}
                        envPreset="city"
                        grain="on"
                        cAzimuthAngle={270}
                        cPolarAngle={180}
                        cDistance={0.5}
                        cameraZoom={15.1}
                        toggleAxis={false}
                        zoomOut={false}
                        hoverState=""
                        enableTransition={false}
                    />
                </ShaderGradientCanvas>
            </div>

            {/* Foreground content */}
            <div className="container mx-auto flex min-h-screen items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-3xl">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}

// components/login-form.tsx