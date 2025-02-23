import winston from 'winston'
import { Logger } from 'ydb-sdk'

const { combine, timestamp, json, errors } = winston.format;

export const logger: Logger = winston.createLogger({
    level: 'debug',
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [new winston.transports.Console()],
    levels: {
        ...winston.config.npm.levels,
        fatal: 0,
        trace: 6,
    },
}) as unknown as Logger;
