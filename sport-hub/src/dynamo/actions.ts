"use server";

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import ddb from "@dynamo/dynamodb";

export async function getItemById(formData: FormData) {
  const id = formData.get("id") as string;

  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: "YourTableName",
        Key: { id },
      })
    );

    return result.Item || null;
  } catch (err) {
    console.error("DynamoDB error:", err);
    return null;
  }
}
