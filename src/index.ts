import express from "express"
import { trimSlashMiddleware } from "./middlewares/trim-slash"
import { createMongoClient, getTodoListDatabase } from "./db"
import dotenv from "dotenv"
import { createListRouter } from "./routes/list"
import cors from "cors"
import { createEntryRouter } from "./routes/entry"

dotenv.config()

const app = express()

function getEnvOrError(key: string) {
	const value = process.env[key]
	if (value === undefined) {
		throw new Error(`Environment variable ${key} is not defined`)
	}
	return value
}

const PORT = process.env.PORT || 3000
const MONGO_URL = getEnvOrError("MONGO_URL")

async function init() {
	const mongoClient = await createMongoClient(MONGO_URL)
	const db = await getTodoListDatabase(mongoClient)

	app.locals.db = db
	app.locals.mongoClient = mongoClient

	app.use(cors())
	app.use(express.json())
	app.use(trimSlashMiddleware)

	app.use("/lists", createListRouter())
	app.use("/entries", createEntryRouter())

	app.listen(PORT, () => {
		console.log(`server started, port: ${PORT}`)
	})
}
init()
