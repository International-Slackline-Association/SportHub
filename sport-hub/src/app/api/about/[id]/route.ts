import { NextResponse } from 'next/server';
import { dynamodb } from '@lib/dynamodb';

const TABLE_NAME = 'users';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await dynamodb.getItem(TABLE_NAME, { userId: id, sortKey: 'Profile' });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dynamodb.deleteItem(TABLE_NAME, { userId: id, sortKey: 'Profile' });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Get existing user first (use composite key)
    const existingUser = await dynamodb.getItem(TABLE_NAME, { userId: id, sortKey: 'Profile' });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user with new data, but protect immutable fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _userId, sortKey: _sortKey, id: _id, ...rawUpdateData } = updateData;

    // Convert empty strings to undefined so DynamoDB doesn't store them
    // Trim string fields
    const safeUpdateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdateData)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        safeUpdateData[key] = trimmed || undefined;
      } else {
        safeUpdateData[key] = value;
      }
    }

    // Regenerate athleteSlug when name or surname changes
    const finalName = ((safeUpdateData.name || existingUser.name || '') as string).trim();
    const finalSurname = ((safeUpdateData.surname || existingUser.surname || '') as string).trim();
    const athleteSlug = finalName
      ? `${finalName}--${finalSurname}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '')
      : existingUser.athleteSlug;

    const updatedUser = {
      ...existingUser,
      ...safeUpdateData,
      // Ensure these immutable fields don't change
      userId: existingUser.userId,
      sortKey: existingUser.sortKey,
      id: existingUser.userId,
      ...(athleteSlug && { athleteSlug }),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.putItem(TABLE_NAME, updatedUser as unknown as Record<string, unknown>);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
