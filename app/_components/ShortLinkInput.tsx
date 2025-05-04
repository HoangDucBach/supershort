"use client"

import { Input, InputProps } from "@heroui/input";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import clsx from "clsx";
import { useState, useRef, useEffect, useMemo } from "react";
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { API_URL } from "@/utils/constants";

type ServerResponse = {
    code: number;
    message: string;
    payload: any;
    status: string;
}


interface ApiErrorResponse {
    message?: string;
    errors?: Record<string, string[]>;
}

interface Props extends Omit<InputProps, 'value' | 'onChange'> {
}

export function ShortLinkInput({ className, ...props }: Props) {
    const [longUrl, setLongUrl] = useState('');
    const [elapsedTime, setElapsedTime] = useState<number | null>(null);
    const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const currentHost = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return '';
    }, []);

    const { mutate: short, data: mutationData, isPending, error } = useMutation<
        ServerResponse,
        AxiosError<ApiErrorResponse>,
        string
    >({
        mutationKey: ["shorten"],
        mutationFn: async (urlToShorten: string) => {
            const start = performance.now();
            try {
                const res = await axios.post(`${API_URL}/short-links`, {
                    longUrl: urlToShorten,
                });
                const end = performance.now();
                setElapsedTime(end - start);
                return res.data;
            } catch (err) {
                const end = performance.now();
                setElapsedTime(end - start);
                throw err;
            }
        },
        onSuccess: (response) => {
            const shortId = response?.payload?.shortId;
            if (shortId) {
                const fullShortenedUrl = `${currentHost}/${shortId}`;
                setShortenedUrl(fullShortenedUrl);
                setLongUrl('');
                addToast({
                    color: "success",
                    title: "Success",
                    description: "Your link has been shortened successfully!",
                });
            } else {
                console.error("API response successful but missing shortId:", response);
                addToast({
                    color: "danger",
                    title: "Error",
                    description: "Received an unexpected response from the server.",
                });
            }
        },
        onError: (error) => {
            console.error("Error shortening link:", error);
            let description = "An error occurred while shortening your link.";
            if (error.response?.data?.message) {
                description = error.response.data.message;
            } else if (error.message) {
                description = error.message;
            }
            addToast({
                color: "danger",
                title: `Error ${error.response?.status || ''}`,
                description: description,
            });
            setShortenedUrl(null);
        }
    });

    const validateUrl = (url: string): boolean => {
        if (!url) {
            addToast({ color: "danger", title: "Error", description: "Please enter a URL." });
            return false;
        }
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                addToast({ color: "danger", title: "Error", description: "URL must start with http:// or https://" });
                return false;
            }
            return true;
        } catch (_) {
            addToast({ color: "danger", title: "Error", description: "Please enter a valid URL format." });
            return false;
        }
    };


    const handleShorten = () => {
        if (validateUrl(longUrl)) {
            short(longUrl);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleShorten();
        }
    };

    const handleCopy = () => {
        if (shortenedUrl) {
            navigator.clipboard.writeText(shortenedUrl)
                .then(() => {
                    addToast({ color: "success", title: "Copied!", description: "Shortened URL copied to clipboard." });
                })
                .catch(err => {
                    console.error("Failed to copy:", err);
                    addToast({ color: "warning", title: "Copy Failed", description: "Could not copy the link automatically." });
                });
        }
    };

    return (
        <div className="w-full max-w-lg flex flex-col items-center justify-center gap-4">
            <div className="w-full flex items-center gap-2">
                <Input
                    ref={inputRef}
                    type="url"
                    fullWidth
                    disabled={isPending}
                    name="longUrl"
                    placeholder="Enter your long URL here (e.g., https://...)"
                    value={longUrl}
                    onChange={(e) => setLongUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    endContent={
                        isPending ? <Spinner size="sm" className="text-primary" /> : null
                    }
                    className={clsx("flex-grow", className)}
                    {...props}
                />
            </div>

            {(shortenedUrl || isPending || error) && (
                <div className="w-full p-3 rounded-2xl bg-content2 dark:bg-content1 border border-divider flex flex-col gap-2 text-sm">
                    <div className="flex flex-row items-center justify-between gap-2 ">
                        <span className="text-primary font-medium flex-shrink-0">Shortened URL:</span>
                        {isPending && !shortenedUrl && <span className="text-foreground-500 italic">Generating...</span>}
                        {shortenedUrl && (
                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                <Link
                                    href={shortenedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={clsx(
                                        "text-foreground hover:underline truncate",
                                        !shortenedUrl && "text-foreground-500"
                                    )}
                                >
                                    {shortenedUrl.replace(/^https?:\/\//, '')}
                                </Link>
                                <Button
                                    isIconOnly
                                    variant="light"
                                    size="sm"
                                    aria-label="Copy shortened URL"
                                    onPress={handleCopy}
                                    className="text-foreground-600 hover:text-primary"
                                >
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {!isPending && !shortenedUrl && error && <span className="text-danger italic">Failed</span>}
                        {!isPending && !shortenedUrl && !error && <span className="text-foreground-500 italic">Result will appear here</span>}
                    </div>
                    {elapsedTime !== null && (
                        <p className="text-xs text-foreground-500 text-right">
                            {error ? 'Failed' : 'Shortened'} in {elapsedTime.toFixed(1)} ms
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}