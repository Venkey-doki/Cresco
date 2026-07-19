import type { ErrorRequestHandler } from "express";
import ApiError from "../utils/ApiError";

export const globalErrorHandler: ErrorRequestHandler = (
	err,
	req,
	res,
	next,
) => {
	const isDevelopment = process.env.NODE_ENV !== "production";

	let statusCode = 500;
	let message = "Internal Server Error";
	let errors: unknown[] = [];

	if (err instanceof ApiError) {
		statusCode = err.statusCode;
		message = err.message;
		errors = err.errors;
	}

	console.error(err);

	res.status(statusCode).json({
		success: false,
		message,
		errors,
		...(isDevelopment && {
			stack: err.stack,
		}),
	});
};
