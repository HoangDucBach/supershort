import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from './utils/constants';

// Lấy API_URL từ biến môi trường

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
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    console.log(`Middleware triggered for path: ${pathname}`);

    // Chỉ bỏ qua trang chủ. Mọi path khác đều có thể là short link.
    if (pathname === '/') {
        console.log('Skipping middleware for root path.');
        return NextResponse.next();
    }

    // (Tùy chọn) Bỏ qua các trang khác của ứng dụng nếu có
    // const knownPaths = ['/about', '/contact'];
    // if (knownPaths.includes(pathname)) {
    //     console.log(`Skipping middleware for known path: ${pathname}`);
    //     return NextResponse.next();
    // }

    const shortId = pathname.substring(1); // Lấy shortId (bỏ dấu / ở đầu)

    // (Tùy chọn) Kiểm tra định dạng cơ bản của shortId
    // const shortIdRegex = /^[a-zA-Z0-9]{6,}$/; // Ví dụ: ít nhất 6 ký tự chữ và số
    // if (!shortIdRegex.test(shortId)) {
    //     console.log(`Invalid shortId format: ${shortId}`);
    //     // Có thể redirect đến trang 404 tùy chỉnh hoặc để Next.js xử lý
    //     return NextResponse.next();
    // }

    if (!API_URL) {
        console.error('API_URL environment variable is not set.');
        // Có thể trả về lỗi 500 hoặc redirect đến trang lỗi
        return new NextResponse('Internal Server Error: Configuration missing.', { status: 500 });
    }

    const fetchUrl = `${API_URL}/short-links/${shortId}`;
    console.log(`Workspaceing original URL for ${shortId} from ${fetchUrl}`);

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET', // GET là mặc định nhưng ghi rõ ràng cũng tốt
            headers: {
                // 'Content-Type': 'application/json', // Không cần thiết cho GET
                'Accept': 'application/json', // Báo cho server biết client muốn nhận JSON
            },
            // Có thể thêm cache control nếu API hỗ trợ và bạn muốn tối ưu
            // next: { revalidate: 60 } // Ví dụ: Cache trong 60 giây
        });
        
        // if (response.status === 404) {
        //     console.log(`Short link not found for id: ${shortId}`);
        //     // Redirect đến trang báo lỗi link không tồn tại thay vì để Next.js 404
        //     const notFoundUrl = new URL('/link-not-found', API_URL); // Tạo URL trang lỗi
        //     notFoundUrl.searchParams.set('id', shortId); // Truyền id để hiển thị nếu cần
        //     return NextResponse.redirect(notFoundUrl, 302); // 302 Found (Tạm thời) vì link có thể được tạo sau này
        // }

        // if (!response.ok) {
        //     // Xử lý các lỗi khác từ API (500, 400, ...)
        //     console.error(`API error for ${shortId}: ${response.status} ${response.statusText}`);
        //     // Có thể redirect đến trang lỗi chung
        //     const errorUrl = new URL('/error', API_URL);
        //     errorUrl.searchParams.set('code', response.status.toString());
        //     return NextResponse.redirect(errorUrl, 302);
        // }

        const data = await response.json();

        // Kiểm tra xem có `originalUrl` trong data không
        console.log(`API response for ${shortId}:`, data);
        if (data && data.result) {
            console.log(`Redirecting ${shortId} to ${data.result}`);
            // Redirect đến URL gốc với mã 301 (Permanent)
            return NextResponse.redirect(new URL(data.result), 301);
        } else {
            console.error(`API response for ${shortId} missing 'originalUrl' field.`);
            // Xử lý trường hợp API trả về 200 nhưng thiếu dữ liệu
            const errorUrl = new URL('/error?code=API_DATA_MISSING', API_URL);
            return NextResponse.redirect(errorUrl, 302);
        }

    } catch (error) {
        console.error('Error in redirect middleware during fetch:', error);
        // Redirect đến trang lỗi chung khi có lỗi mạng hoặc lỗi khác
        const errorUrl = new URL('/error?code=FETCH_FAILED', API_URL);
        return NextResponse.redirect(errorUrl, 302);
        // Hoặc return NextResponse.next(); để Next.js xử lý (có thể ra trang 500 mặc định)
    }
}