"use client"

import * as React from "react"
import { Moon, Sun, ArrowUpIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconPlus } from "@tabler/icons-react"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
    InputGroupText,
} from "@/components/ui/input-group"

type ChatMessage = { role: "user" | "assistant"; content: string }
type Mode = "auto" | "agent 1" | "agent 2"

export default function Page() {
    const { setTheme } = useTheme()
    const router = useRouter()

    const [text, setText] = React.useState("")
    const [file, setFile] = React.useState<File | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)

    const [messages, setMessages] = React.useState<ChatMessage[]>([])
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const [mode, setMode] = React.useState<Mode>("auto")

    async function handleLogout() {
        await fetch("/api/logout", { method: "POST" })
        router.push("/")
    }

    function ModeToggle() {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setError(null)
        const selected = e.target.files?.[0] ?? null
        if (selected && selected.type !== "application/pdf") {
            setError("Only PDF files are allowed.")
            setFile(null)
            e.target.value = ""
            return
        }
        setFile(selected)
    }

    async function extractPdfText(pdfFile: File): Promise<string> {
        const pdfjsLib = await import("pdfjs-dist")

        // Assign a string URL for the worker without ts comment directives
        const workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs"
            // pdf.js reads GlobalWorkerOptions at runtime; use a structural cast to allow the assignment
        ;(pdfjsLib.GlobalWorkerOptions as unknown as { workerSrc: string }).workerSrc = workerSrc

        const arrayBuf = await pdfFile.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise

        let fullText = ""
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum)
            const content = await page.getTextContent()
            const strings = content.items.map((item) => ("str" in item ? item.str : ""))
            fullText += strings.join(" ") + "\n"
        }
        return fullText.trim()
    }

    function pushMessage(msg: ChatMessage) {
        setMessages((prev) => [...prev, msg])
        setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }, 0)
    }

    async function trySend() {
        if (!text.trim() && !file) {
            setError("Please enter text or attach a PDF file before sending.")
            return
        }
        setError(null)
        setLoading(true)

        const userText = text.trim()
        pushMessage({ role: "user", content: userText || (file ? `Question about ${file.name}` : "") })

        try {
            let extracted = ""
            if (file) {
                extracted = await extractPdfText(file)
            }

            const resp = await fetch("/api/ai/chat-with-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: userText, text: extracted, mode }),
            })

            const data = await resp.json()
            if (!resp.ok) {
                const message = data?.message || "Request failed"
                setError(message)
                pushMessage({ role: "assistant", content: message })
                return
            }

            const answer =
                typeof data === "string"
                    ? data
                    : Array.isArray(data)
                        ? data[0]?.generated_text || JSON.stringify(data)
                        : data.generated_text || data.answer || JSON.stringify(data)

            pushMessage({ role: "assistant", content: answer })

            setText("")
            setFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        } catch (e) {
            const err = e as Error
            const msg = err.message || "Unexpected error"
            setError(msg)
            pushMessage({ role: "assistant", content: `Error: ${msg}` })
        } finally {
            setLoading(false)
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void trySend()
        }
    }

    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1)

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        <Button variant="destructive" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </header>

                <div className="flex-1 flex flex-col gap-4 p-4 pb-32 relative">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto rounded-md border p-3 space-y-3 bg-background/60"
                    >
                        {messages.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Ask a question or attach a PDF to start the conversation.
                            </p>
                        )}
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={m.role === "user" ? "rounded-lg bg-primary/10 p-2" : "rounded-lg bg-muted p-2"}
                            >
                <span className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {m.role}
                </span>
                                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                            </div>
                        ))}
                        {loading && <p className="text-xs text-muted-foreground">Processing...</p>}
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 pb-4 flex justify-center pointer-events-none">
                    <div className="w-full max-w-2xl pointer-events-auto">
                        <InputGroup>
                            <InputGroupTextarea
                                placeholder="Ask, Search or Chat..."
                                className="w-full"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={2}
                            />
                            <InputGroupAddon align="block-end">
                                <InputGroupButton
                                    variant="outline"
                                    className="rounded-full"
                                    size="icon-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach PDF"
                                >
                                    <IconPlus />
                                </InputGroupButton>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                                {file && <InputGroupText className="ml-2 max-w-[10ch] truncate">{file.name}</InputGroupText>}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <InputGroupButton variant="ghost">{modeLabel}</InputGroupButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="top" align="start" className="[--radius:0.95rem]">
                                        <DropdownMenuItem onClick={() => setMode("auto")}>Auto</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setMode("agent 1")}>Agent 1</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setMode("agent 2")}>Agent 2</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Separator orientation="vertical" className="!h-4" />
                                <InputGroupButton
                                    variant="default"
                                    className="rounded-full"
                                    size="icon-xs"
                                    onClick={trySend}
                                    title="Send"
                                    disabled={loading}
                                >
                                    <ArrowUpIcon />
                                    <span className="sr-only">Send</span>
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
