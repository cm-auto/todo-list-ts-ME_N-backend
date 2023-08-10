import { Db, MongoClient, ObjectId } from "mongodb";
import { Request } from "express";

export async function createMongoClient(url: string) {
	const client = new MongoClient(url)
	await client.connect()
	return client
}

export async function getTodoListDatabase(client: MongoClient) {
	return client.db("todoList")
}

export async function retrieveAllLists(db: Db, start: number = 0, length: number | undefined = undefined) {
	const collection = getListCollection(db)
	const cursor = collection.find()
	return cursor.toArray()
}

export async function doesListExist(db: Db, listId: string) {
	const collection = getListCollection(db)
	const list = await collection.findOne(new ObjectId(listId))
	return list !== null
}

export function getListCollection(db: Db) {
	return db.collection<List>("list")
}

export async function retrieveAllEntries(db: Db, start: number = 0, length: number | undefined = undefined) {
	const collection = getEntryCollection(db)
	const cursor = collection.find()
	return cursor.toArray()
}

export async function retrieveAllEntriesBelongingToList(db: Db, listId: string) {
	const collection = getEntryCollection(db)
	const cursor = collection.find({ listId })
	return cursor.toArray()
}

export function getEntryCollection(db: Db) {
	return db.collection<Entry>("entry")
}

export function getDbFromRequest(request: Request) {
	return request.app.locals.db as Db
}