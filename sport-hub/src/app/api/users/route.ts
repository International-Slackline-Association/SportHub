import { NextResponse } from 'next/server';
import { getUsers } from '@lib/data-services';
// import { UserSubType } from '@types/rbac';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const subtype = (url.searchParams.get('subtype') || '').trim();
    const users = await getUsers({ subtype });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users data' },
      { status: 500 }
    );
  }
}