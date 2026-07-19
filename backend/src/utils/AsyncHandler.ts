import type { NextFunction, Request, Response, RequestHandler } from "express";

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<unknown>;

const asyncRequestHandler = (fn: AsyncRequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncRequestHandler;