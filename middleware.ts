import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from './utils/constants';

export const runtime = 'experimental-edge';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|not-found).*)',
    ],
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/') {
        console.log('Skipping middleware for root path.');
        return NextResponse.next();
    }


    const shortId = pathname.substring(1);


    if (!API_URL) {
        console.error('API_URL environment variable is not set.');
        return new NextResponse('Internal Server Error: Configuration missing.', { status: 500 });
    }

    const fetchUrl = `${API_URL}/short-links/${shortId}`;

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            cache: 'force-cache',
            next: { revalidate: 60, tags: ['short-links'] },
        });

        if (response.status === 404) {
            const notFoundUrl = new URL('/not-found',);
            notFoundUrl.searchParams.set('id', shortId);
            return NextResponse.redirect(notFoundUrl, 302);
        }

        if (!response.ok) {
            console.error(`API error for ${shortId}: ${response.status} ${response.statusText}`);
            const errorUrl = new URL('/error', API_URL);
            errorUrl.searchParams.set('code', response.status.toString());
            return NextResponse.redirect(errorUrl, 302);
        }

        const data = await response.json();
        console.log(`API bach for ${shortId}:`, data);
        if (data) {
            const payload = data.payload;
            const { longUrl } = payload;

            return NextResponse.redirect(new URL(longUrl), 301);
        } else {
            console.error(`API response for ${shortId} missing 'originalUrl' field.`);
            const errorUrl = new URL('/not-found');
            return NextResponse.redirect(errorUrl, 302);
        }

    } catch (error) {
        console.error('Error in redirect middleware during fetch:', error);
        const errorUrl = new URL('not-found');
        return NextResponse.redirect(errorUrl, 302);
    }
}