import { Driver } from 'ydb-sdk'

declare global {
    namespace Express {
        export interface Request {
            apiGateway: {
                context: {
                    driver: Driver
                }
            }
        }
    }
}
