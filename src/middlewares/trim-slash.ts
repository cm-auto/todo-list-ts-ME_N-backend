import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export function trimSlashMiddleware(request: Request, response: Response, next: NextFunction) {
	const { path } = request
	if (path.endsWith("/") && path !== "/") {
		const trimmed = path.replace(/\/*$/, "")
		// return prevents other middlewares and handles being called
		return response.redirect(StatusCodes.PERMANENT_REDIRECT, trimmed)
	}
	next()
}