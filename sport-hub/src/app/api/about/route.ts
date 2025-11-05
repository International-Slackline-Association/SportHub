import { dynamodb } from '@lib/dynamodb'
import { NextResponse } from 'next/server';

const TABLE_NAME = 'rankings';

export async function GET() {
  try {
    const users = await dynamodb.scanItems(TABLE_NAME);
    // Ensure we return an array, even if scanItems returns null/undefined
    return NextResponse.json(users || []);

  } catch (error) {
    console.error('DynamoDB error:', error);
    // Handle missing table gracefully by returning empty array
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') {
      console.log(`Table ${TABLE_NAME} does not exist. Returning empty array.`);
      return NextResponse.json([]);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { id, name, email, country } = await request.json();
    
    if (!id || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    const userId = id || `athlete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const user = {
      'rankings-dev-key': userId,
      id: userId,
      name,
      email,
      country: country || undefined,
      createdAt: new Date().toISOString(),
      athleteId: userId,
    };

    await dynamodb.putItem(TABLE_NAME, user as unknown as Record<string, unknown>);
    return NextResponse.json(user, { status: 201 });

  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}