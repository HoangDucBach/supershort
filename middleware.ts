import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from './utils/constants';

export const runtime = 'experimental-edge';

const CACHE_DURATION = 3600;

const LINKS_CACHE = new Map<string, { longUrl: string; expiresAt: number }>();

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|not-found).*)',
    ],
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/') {
        return NextResponse.next();
    }

    const shortId = pathname.substring(1);

    if (shortId.length < 3 || shortId.includes('/')) {
        const notFoundUrl = new URL('/not-found', request.url);
        notFoundUrl.searchParams.set('id', shortId);
        return NextResponse.redirect(notFoundUrl, 302);
    }

    const now = Date.now();
    const cachedLink = LINKS_CACHE.get(shortId);

    if (cachedLink && cachedLink.expiresAt > now) {
        console.log(`Cache hit for ${shortId}`);
        return NextResponse.redirect(new URL(cachedLink.longUrl), 301);
    }

    if (!API_URL) {
        console.error('API_URL environment variable is not set.');
        return new NextResponse('Internal Server Error: Configuration missing.', { status: 500 });
    }

    const fetchUrl = `${API_URL}/short-links/${shortId}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(fetchUrl, {
            method: 'GET',
            cache: 'force-cache',
            next: { 
                revalidate: 60, 
                tags: [`short-link-${shortId}`] 
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.status === 404) {
            const notFoundUrl = new URL('/not-found', request.url);
            notFoundUrl.searchParams.set('id', shortId);
            return NextResponse.redirect(notFoundUrl, 302);
        }

        if (!response.ok) {
            console.error(`API error for ${shortId}: ${response.status} ${response.statusText}`);
            const errorUrl = new URL('/error', request.url);
            errorUrl.searchParams.set('code', response.status.toString());
            return NextResponse.redirect(errorUrl, 302);
        }

        const data = await response.json();
        
        if (data && data.payload && data.payload.longUrl) {
            const { longUrl } = data.payload;
            
            LINKS_CACHE.set(shortId, {
                longUrl,
                expiresAt: now + (CACHE_DURATION * 1000)
            });
            
            if (LINKS_CACHE.size > 10000) {
                const keysToDelete = Array.from(LINKS_CACHE.keys()).slice(0, 1000);
                keysToDelete.forEach(key => LINKS_CACHE.delete(key));
            }

            return NextResponse.redirect(new URL(longUrl), 301);
        } else {
            console.error(`API response for ${shortId} missing 'longUrl' field.`);
            const errorUrl = new URL('/not-found', request.url);
            return NextResponse.redirect(errorUrl, 302);
        }

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`Request timeout for ${shortId}`);
            const errorUrl = new URL('/error', request.url);
            errorUrl.searchParams.set('code', '408');
            return NextResponse.redirect(errorUrl, 302);
        }
        
        console.error('Error in redirect middleware during fetch:', error);
        const errorUrl = new URL('/not-found', request.url);
        return NextResponse.redirect(errorUrl, 302);
    }
}
