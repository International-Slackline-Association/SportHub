import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-Demand Revalidation API
 *
 * This endpoint allows you to manually revalidate static pages after updating data.
 *
 * Usage:
 *   POST /api/revalidate
 *   Body: { path: "/rankings", secret: "your_secret" }
 *
 * Or revalidate multiple paths:
 *   Body: { paths: ["/rankings", "/events"], secret: "your_secret" }
 *
 * Set REVALIDATE_SECRET in your environment variables for security.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, paths, secret } = body;

    // Check for secret to confirm this is a valid request
    const revalidateSecret = process.env.REVALIDATE_SECRET;

    if (revalidateSecret && secret !== revalidateSecret) {
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate single path
    if (path) {
      revalidatePath(path);
      return NextResponse.json({
        revalidated: true,
        path,
        now: Date.now(),
      });
    }

    // Revalidate multiple paths
    if (paths && Array.isArray(paths)) {
      paths.forEach((p) => revalidatePath(p));
      return NextResponse.json({
        revalidated: true,
        paths,
        now: Date.now(),
      });
    }

    return NextResponse.json(
      { message: 'Missing path or paths parameter' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Error revalidating', error: String(error) },
      { status: 500 }
    );
  }
}
