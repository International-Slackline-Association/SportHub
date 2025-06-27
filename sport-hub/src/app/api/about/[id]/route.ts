import { NextResponse } from 'next/server';
import { dynamodb } from '@lib/dynamodb';

const TABLE_NAME = 'rankings-dev';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = await dynamodb.getItem(TABLE_NAME, { id });
    
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await dynamodb.deleteItem(TABLE_NAME, { id });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    // Get existing user first
    const existingUser = await dynamodb.getItem(TABLE_NAME, { id });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user with new data
    const updatedUser = {
      ...existingUser,
      ...updateData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.putItem(TABLE_NAME, updatedUser);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}