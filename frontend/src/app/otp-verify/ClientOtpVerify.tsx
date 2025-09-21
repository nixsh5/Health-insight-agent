"use client"

import { useSearchParams } from "next/navigation"
import { OTPVerifyForm } from "@/components/OTPVerifyForm"

export default function ClientOtpVerify() {
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || ""

    return (
        <div className="min-h-screen flex items-center justify-center">
            <OTPVerifyForm email={email} />
        </div>
    )
}
