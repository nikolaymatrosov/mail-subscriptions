import { Request, RequestHandler, Response } from 'express'
import { logger } from '../../logger'
import { SubscriptionVerifiedEvent } from '../../models'
import { generateId } from '../../ids'
import { getSubscription, insertEvent, verifySubscription } from '../db'

export const verify: RequestHandler = async (req: Request, res: Response) => {
    const driver = req.apiGateway.context.driver;
    const subscriptionId = req.params.subscriptionId;

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

                const sub = subscriptions[0];
                sub.verifiedAt = new Date();

                await verifySubscription(session, sub);
                await insertEvent(session, new SubscriptionVerifiedEvent({
                    id: generateId(),
                    createdAt: new Date(),
                    subscriptionId: sub.id,
                    payload: {
                        type: 'SubscriptionVerified',
                        subscriptionId: sub.id,
                        verifiedAt: sub.verifiedAt,
                        headers: req.headers,
                    },
                }));
                await session.commitTransaction();
            }
        });
    } catch (e) {
        logger.error('Error verifying subscription', { error: e });
        res.status(500).json({
            message: 'Internal Server Error'
        });
        return
    }

    res.redirect('https://nikolaymatrosov.ru/');
}
