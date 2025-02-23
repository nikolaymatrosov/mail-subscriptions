import { generateId } from '../../ids'
import { deleteSubscription, getSubscription, insertEvent } from '../db'
import { UnsubscribedEvent } from '../../models'
import { Request, RequestHandler, Response } from 'express'
import { logger } from '../../logger'
import { YdbError } from 'ydb-sdk'
import * as handlebars from 'handlebars'
import * as fs from 'node:fs'
import * as path from 'node:path'


export const unsubscribePost: RequestHandler = async (req: Request, res: Response) => {
    const driver = req.apiGateway.context.driver;
    const subscriptionId = req.params.subscriptionId;
    let retPath = req.query.retPath;
    if (retPath) {
        retPath = decodeURIComponent(retPath as string);
    }

    try {
        await driver.queryClient.do({
            fn: async (session) => {
                await session.beginTransaction({ serializableReadWrite: {} });

                const subscriptions = await getSubscription(session, subscriptionId);

                if (subscriptions.length == 0) {
                    await session.rollbackTransaction();
                    res.json({
                        message: 'Subscription not found'
                    });
                    return
                }

                await deleteSubscription(session, subscriptionId);
                await insertEvent(session, new UnsubscribedEvent({
                    id: generateId(),
                    createdAt: new Date(),
                    subscriptionId: subscriptionId,
                    payload: {
                        type: 'Unsubscribed',
                        unsubscribedAt: new Date(),
                        headers: req.headers,
                    },
                }));
                await session.commitTransaction();
            }
        });
    } catch (e) {
        if (e instanceof YdbError) {
            logger.error('err', { stack: e.stack, message: e.message, cause: e.cause });
        }
        console.error(e);
        res.status(500).json({
            message: 'Internal Server Error'
        });
        return
    }
    if (retPath) {
        res.redirect(retPath as string);
        return
    }
    res.json({
        message: 'unsubscribed',
    });
}


export function unsubscribe(req: Request, res: Response) {
    const rawTemplate = fs.readFileSync(path.join(__dirname, '../../templates/unsubscribe.html'), 'utf8');
    const template = handlebars.compile(rawTemplate);
    res.send(template({ subscriptionId: req.params.subscriptionId }));
}

