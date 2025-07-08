import { dynamodb } from '@lib/dynamodb'
import { NextResponse } from 'next/server';

const TABLE_NAME = 'rankings-dev';

export async function GET() {
  try {
    const users = await dynamodb.scanItems(TABLE_NAME);
    return NextResponse.json(users);
    
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: { json: () => PromiseLike<{ id: any; name: any; email: any; }> | { id: any; name: any; email: any; }; }) {
  try {
    const { id, name, email } = await request.json();
    
    if (!id || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = {
      'rankings-dev-key': id,
      id,
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.putItem(TABLE_NAME, user);
    return NextResponse.json(user, { status: 201 });

  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}