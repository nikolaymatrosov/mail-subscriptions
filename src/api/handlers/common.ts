import { Request } from 'express'

export function getIp(req: Request): string {
    const ip = req.headers['x-forwarded-for'];
    if (ip === undefined) {
        return 'unknown';
    }
    return Array.isArray(ip) ? ip[0] : ip;
}
