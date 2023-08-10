import { Router, Request, Response } from "express"
import { doesListExist, getEntryCollection, retrieveAllEntries } from "../db"
import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import { generateValidationMiddleware } from "../middlewares/validate"
import { ObjectId } from "mongodb"

async function getAllEntries(req: Request, res: Response) {
	const lists = await retrieveAllEntries(req.app.locals.db)
	res.json(lists)
}

export async function getEntryById(req: Request, res: Response) {
	const id = req.params.id
	const db = req.app.locals.db
	const entryCollection = getEntryCollection(db)
	const list = ObjectId.isValid(id) ? await entryCollection.findOne(new ObjectId(id)) : null

	if (!list) {
		res.status(StatusCodes.NOT_FOUND).json({ error: 'Entry not found' })
	} else {
		res.json(list)
	}
}

async function postEntry(req: Request, res: Response) {
	const newEntry: Entry = req.body

	const listExists = await doesListExist(req.app.locals.db, newEntry.listId)
	if (!listExists) {
		return res.status(StatusCodes.NOT_FOUND).json({ error: 'List not found' })
	}

	const db = req.app.locals.db
	const entryCollection = getEntryCollection(db)
	try {
		const insertResult = await entryCollection.insertOne(newEntry)
		const newEntryWithId = { ...newEntry, _id: insertResult.insertedId }
		res.status(StatusCodes.CREATED).json(newEntryWithId);
	} catch (e) {
		console.log(e)
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	}
}

async function patchEntryById(req: Request, res: Response) {
	const id = req.params.id
	const updatedEntry: Entry = req.body

	// if the listId will not be changed
	// then we also don't need to check if the list exists
	if (updatedEntry.listId !== undefined) {
		const listExists = await doesListExist(req.app.locals.db, updatedEntry.listId)
		if (!listExists) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'List not found' })
		}
	}

	const { _id, ...setValues } = updatedEntry

	const entryCollection = getEntryCollection(req.app.locals.db)
	try {
		// TypeScript compiler says that "ObjectId" is not assignable to "_id"
		// however this does work, so ignoring the error
		// @ts-ignore
		const result = await entryCollection.updateOne({ _id: new ObjectId(id) }, { $set: setValues })
		if (result.matchedCount === 0) {
			return res.status(StatusCodes.NOT_FOUND).json({ message: 'Entry not found' })
		}
		return res.status(StatusCodes.OK).json({ ...updatedEntry, _id: id })
	} catch (e) {
		console.log(e)
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	}
}

async function deleteEntryById(req: Request, res: Response) {
	const id = req.params.id
	const entryCollection = getEntryCollection(req.app.locals.db)
	try {
		// TypeScript compiler says that "ObjectId" is not assignable to "_id"
		// however this does work, so ignoring the error
		// @ts-ignore
		const deleteResult = await entryCollection.deleteOne({ _id: new ObjectId(id) })
		if (deleteResult.deletedCount === 0) {
			return res.sendStatus(StatusCodes.NOT_FOUND)
		}
		return res.sendStatus(StatusCodes.NO_CONTENT)
	} catch (e) {
		console.error(e)
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR)
	}
}

export function createEntryRouter() {
	const postEntrySchema = Joi.object<Entry>({
		listId: Joi.string().required(),
		name: Joi.string().required(),
		done: Joi.boolean().optional(),
	})

	const patchEntrySchema = Joi.object<Entry>({
		_id: Joi.string().optional(),
		listId: Joi.string().optional(),
		name: Joi.string().optional(),
		done: Joi.boolean().optional(),
	})

	const router = Router()
	router.get('', getAllEntries)
	router.get('/:id', getEntryById)
	router.post('', generateValidationMiddleware(postEntrySchema), postEntry)
	router.patch('/:id', generateValidationMiddleware(patchEntrySchema), patchEntryById)
	router.delete('/:id', deleteEntryById)
	return router
}
