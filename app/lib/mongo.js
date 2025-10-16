import { MongoClient } from "mongodb";

let cached = globalThis.__MONGO__;
if (!cached) {
  cached = globalThis.__MONGO__ = { client: null, db: null };
}

export async function getDb() {
  const uri = process.env.MONGODB_URI || "";
  const dbName = process.env.MONGODB_DB || "appdb";
  if (!uri) return null;

  if (cached.db) return cached.db;

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  cached.client = client;
  cached.db = db;
  return db;
}