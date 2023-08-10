import { Router, Request, Response } from "express"
import { getEntryCollection, getListCollection, retrieveAllEntriesBelongingToList, retrieveAllLists } from "../db"
import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import { generateValidationMiddleware } from "../middlewares/validate"
import { Db, MongoClient, ObjectId } from "mongodb"
import { ParentAndChildren } from "../models/parent-and-children"


async function getAllLists(req: Request, res: Response) {
	const lists = await retrieveAllLists(req.app.locals.db)
	res.json(lists)
}

async function retrieveListByIdFromRequest(req: Request) {
	const id = req.params.id
	const db = req.app.locals.db
	const listCollection = getListCollection(db)
	const list = ObjectId.isValid(id) ? await listCollection.findOne(new ObjectId(id)) : null
	return list
}

async function getListById(req: Request, res: Response) {
	const list = retrieveListByIdFromRequest(req)

	if (!list) {
		res.status(StatusCodes.NOT_FOUND).json({ message: 'List not found' })
	} else {
		res.json(list)
	}
}

async function getListByIdAndItsEntries(req: Request, res: Response) {
	const list = await retrieveListByIdFromRequest(req)

	if (!list) {
		return res.status(StatusCodes.NOT_FOUND).json({ message: 'List not found' })
	}

	const id = req.params.id
	const db = req.app.locals.db

	const entries = await retrieveAllEntriesBelongingToList(db, id)

	const listAndEntries: ParentAndChildren<List, Entry> = {
		parent: list,
		children: entries,
	}

	res.status(StatusCodes.OK).json(listAndEntries)
}

async function postList(req: Request, res: Response) {
	const newList: List = req.body
	const db = req.app.locals.db
	const listCollection = getListCollection(db)
	try {
		const insertResult = await listCollection.insertOne(newList)
		const newListWithId = { ...newList, _id: insertResult.insertedId }
		res.status(StatusCodes.CREATED).json(newListWithId);
	} catch (e) {
		console.log(e)
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	}
}

async function patchListById(req: Request, res: Response) {
	const id = req.params.id
	const updatedList: List = req.body
	const listCollection = getListCollection(req.app.locals.db)
	try {
		const result = await listCollection.updateOne({ _id: id }, updatedList)
		if (result.matchedCount === 0) {
			return res.status(StatusCodes.NOT_FOUND).json({ message: 'Entry not found' })
		}
		return res.json({ ...patchListById, _id: id })
	} catch (e) {
		console.log(e)
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	}
}

async function deleteListById(req: Request, res: Response) {

	const listId = req.params.id
	const db = req.app.locals.db as Db


	// for transactions to work server needs to be replica set

	// const mongoClient: MongoClient = req.app.locals.mongoClient
	// const session = mongoClient.startSession()
	// const listCollection = getListCollection(db)
	// const entryCollection = getEntryCollection(db)

	// try {
	// 	session.startTransaction()

	// 	// Delete entries that refer to the list
	// 	await entryCollection.deleteMany({ listId: listId }, { session })

	// 	// Delete the list
	// 	const deleteResult = await listCollection.deleteOne({ _id: listId }, { session })

	// 	if (deleteResult.deletedCount === 0) {
	// 		await session.abortTransaction()
	// 		return res.status(StatusCodes.NOT_FOUND).json({ message: 'List not found' })
	// 	}

	// 	await session.commitTransaction()
	// 	return res.sendStatus(StatusCodes.NO_CONTENT)
	// } catch (error) {
	// 	console.error('Error deleting list with entries:', error)
	// 	await session.abortTransaction()
	// 	return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	// } finally {
	// 	session.endSession()
	// }

	const listCollection = getListCollection(db)
	const entryCollection = getEntryCollection(db)
	// Delete entries that refer to the list
	await entryCollection.deleteMany({ listId })

	// Delete the list
	// TypeScript compiler says that "ObjectId" is not assignable to "_id"
	// however this does work, so ignoring the error
	// @ts-ignore
	const deleteResult = await listCollection.deleteOne({ _id: new ObjectId(listId) })

	if (deleteResult.deletedCount === 0) {
		return res.status(StatusCodes.NOT_FOUND).json({ message: 'List not found' })
	}

	return res.sendStatus(StatusCodes.NO_CONTENT)

}



export function createListRouter() {

	const postListSchema = Joi.object<List>({
		name: Joi.string().required(),
	})

	const patchListSchema = Joi.object<List>({
		name: Joi.string().optional(),
	})

	const router = Router()
	router.get('', getAllLists)
	router.get('/:id', getListById)
	router.get('/:id/entries', getListByIdAndItsEntries)
	router.post('', generateValidationMiddleware(postListSchema), postList)
	router.patch('/:id', generateValidationMiddleware(patchListSchema), patchListById)
	router.delete('/:id', deleteListById)
	return router
}
