import { dynamodb, USERS_TABLE } from '@lib/dynamodb'
import { NextResponse, NextRequest } from 'next/server';

const DEFAULT_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      1000 // Max 1000 items per request
    );
    const cursorParam = searchParams.get('cursor');
    const searchQuery = searchParams.get('search')?.toLowerCase().trim() || '';

    // Decode cursor (base64 encoded lastEvaluatedKey)
    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (cursorParam) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(cursorParam, 'base64').toString('utf-8'));
      } catch {
        return NextResponse.json(
          { error: 'Invalid cursor' },
          { status: 400 }
        );
      }
    }

    // Filter options for Profile records only (hierarchical schema)
    // Add search filter if search query is provided
    let filterExpression = 'sortKey = :profileKey';
    const expressionAttributeValues: Record<string, unknown> = { ':profileKey': 'Profile' };
    const expressionAttributeNames: Record<string, string> = {};

    if (searchQuery) {
      filterExpression += ' AND (contains(#searchName, :search) OR contains(#searchEmail, :search) OR contains(#searchSlug, :search))';
      expressionAttributeValues[':search'] = searchQuery;
      expressionAttributeNames['#searchName'] = 'name';
      expressionAttributeNames['#searchEmail'] = 'email';
      expressionAttributeNames['#searchSlug'] = 'athleteSlug';
    }

    const filterOptions = {
      filterExpression,
      expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { expressionAttributeNames }),
    };

    // Get total count only on first request (no cursor) for efficiency
    const totalCount = !exclusiveStartKey
      ? await dynamodb.countItems(USERS_TABLE, filterOptions)
      : undefined;

    const result = await dynamodb.scanItemsPaginated(USERS_TABLE, {
      limit,
      exclusiveStartKey,
      ...filterOptions,
    });

    // Transform items to match expected UI schema
    const users = result.items.map(item => ({
      id: item.userId ?? item.id ?? '',
      name: item.name ?? item.athleteSlug ?? '',
      surname: item.surname ?? '',
      email: item.email ?? '',
      createdAt: item.createdAt ?? '',
      updatedAt: item.updatedAt,
      userId: item.userId,
      isaUsersId: item.isaUsersId,
      country: item.country,
      city: item.city,
      birthdate: item.birthdate,
      gender: item.gender,
      firstCompetition: item.firstCompetition,
      lastCompetition: item.lastCompetition,
      totalPoints: item.totalPoints ?? 0,
      contestsParticipated: item.contestsParticipated ?? item.contestCount ?? 0,
      role: item.role ?? 'user',
      userSubTypes: item.userSubTypes ?? [],
      primarySubType: item.primarySubType,
    }));

    // Encode next cursor for client
    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return NextResponse.json({
      users,
      nextCursor,
      hasMore: result.hasMore,
      ...(totalCount !== undefined && { totalCount }),
    });

  } catch (error) {
    console.error('DynamoDB error:', error);
    // Handle missing table gracefully by returning empty array
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') {
      console.log(`Table ${USERS_TABLE} does not exist. Returning empty array.`);
      return NextResponse.json({ users: [], nextCursor: null, hasMore: false });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trimmedName = body.name?.trim();
    const trimmedSurname = body.surname?.trim() || undefined;
    const trimmedEmail = body.email?.trim();

    if (!body.id || !trimmedName || !trimmedEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    const userId = body.id || `athlete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const athleteSlug = `${trimmedName}--${trimmedSurname || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '');

    const user = {
      userId: userId,
      name: trimmedName,
      surname: trimmedSurname,
      email: trimmedEmail,
      athleteSlug,
      country: body.country || undefined,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.putItem(USERS_TABLE, user as unknown as Record<string, unknown>);
    return NextResponse.json(user, { status: 201 });

  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}