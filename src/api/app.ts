import { Driver, TokenAuthService, } from 'ydb-sdk';
import serverless from 'serverless-http'
import bodyParser from 'body-parser'
import * as express from 'express'
import { logger } from '../logger'
import { subscribe } from './handlers/subscribe'
import { verify } from './handlers/verify'
import { unsubscribe, unsubscribePost } from './handlers/unsubscribe'

const app = express.default();

app.use(bodyParser.json());

app.post('/subscribe', subscribe);
app.get('/verify/:subscriptionId', verify);
app.post('/unsubscribe/:subscriptionId', unsubscribePost);
app.get('/unsubscribe/:subscriptionId', unsubscribe);


let endpoint = process.env.YDB_ENDPOINT;
let database = process.env.YDB_DATABASE;
const wrapper = serverless(app);
// noinspection JSUnusedGlobalSymbols
export const handler = async (event: any, context: any) => {

    const authService = new TokenAuthService(context.token?.access_token ?? '');

    const driver = new Driver({ endpoint, database, authService, logger: logger });
    const timeout = 3000;
    if (!await driver.ready(timeout)) {
        logger.error(`Driver has not become ready in ${timeout}ms!`);
        return {
            statusCode: 500,
            body: 'Internal Server Error'
        }
    }

    context.driver = driver;
    return wrapper(event, context);
}

