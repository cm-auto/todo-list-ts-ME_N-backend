import { Request, Response, NextFunction } from "express"
import { StatusCodes } from "http-status-codes"
import Joi from "joi"

export type ValidationMiddlewareOptions = {
	enforceJson: boolean
}

export function generateValidationMiddleware(
	schema: Joi.Schema,
	options: ValidationMiddlewareOptions = { enforceJson: true },
) {
	return (req: Request, res: Response, next: NextFunction) => {
		const { enforceJson } = options
		// currently the server only supports json
		// however if other formats would be supported
		// in the future, enforcing json could be easily
		// turned off by specifying "enforceJson: false"
		if (enforceJson) {
			const contentType = req.headers["content-type"]
			if (contentType !== "application/json") {
				// return prevents other middlewares and handles being called
				return res.sendStatus(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
			}
		}
		const { error } = schema.validate(req.body)
		if (error) {
			const { message } = error
			return res.status(400).json({ message })
		}
		next()
	}
}