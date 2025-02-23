import { TypedValues } from 'ydb-sdk'
import { type QuerySession } from 'ydb-sdk/build/cjs/src/query/query-session'
import { Event, EVENTS_TABLE, Subscription, SUBSCRIPTIONS_TABLE } from '../models'
import { logger } from '../logger'
import { type IExecuteResult } from 'ydb-sdk/build/cjs/src/query'


export async function createSubscription(
    session: QuerySession,
    subscription: Subscription,
): Promise<IExecuteResult> {
    const text = `
DECLARE $data AS List<Struct<id: Utf8, ip: Utf8, email: Utf8, verified: Bool, created_at: Timestamp, verified_at: Optional<Timestamp>>>;
INSERT INTO ${SUBSCRIPTIONS_TABLE} (id, ip, email, verified, created_at, verified_at) SELECT
    id, ip, email, verified, created_at, verified_at
FROM AS_TABLE ($data);
`;
    logger.info('creating subscription', subscription);
    return session.execute({
        text,
        parameters: {
            $data: Subscription.asTypedCollection([subscription]),
        },
    });
}

export async function getSubscription(
    session: QuerySession,
    id: string,
): Promise<Subscription[]> {
    const text = `
DECLARE $id AS Utf8;
SELECT * FROM ${SUBSCRIPTIONS_TABLE} WHERE id = $id;
`;
    logger.info('getting subscription', id);
    const { resultSets, } = await session.execute({
        text,
        parameters: {
            $id: TypedValues.utf8(id),
        },
    });
    return Subscription.from(resultSets);
}

export async function getSubscriptionByEmail(
    session: QuerySession,
    email: string,
): Promise<Subscription[]> {
    const text = `
DECLARE $email AS Utf8;
SELECT * FROM ${SUBSCRIPTIONS_TABLE} VIEW ${SUBSCRIPTIONS_TABLE}_email WHERE email = $email;
`;
    logger.info('getting subscription by email', email);
    const { resultSets, } = await session.execute({
        text,
        parameters: {
            $email: TypedValues.utf8(email),
        },
    });
    return Subscription.from(resultSets);
}

export async function listSubscriptionsByIp(
    session: QuerySession,
    ip: string,
): Promise<Subscription[]> {
    const text = `
DECLARE $ip AS Utf8;
SELECT * FROM ${SUBSCRIPTIONS_TABLE} VIEW ${SUBSCRIPTIONS_TABLE}_ip WHERE ip = $ip;
`;
    logger.info('listing subscriptions by ip', ip);
    const { resultSets } = await session.execute({
        text,
        parameters: {
            $ip: TypedValues.utf8(ip),
        },
    });
    return Subscription.from(resultSets);
}

export async function insertEvent(
    session: QuerySession,
    event: Event<any>,
): Promise<IExecuteResult> {
    const text = `
DECLARE $data AS List<Struct<id: Utf8, created_at: Timestamp, subscription_id: Utf8, payload: JsonDocument>>;
INSERT INTO ${EVENTS_TABLE} (id, created_at, subscription_id, payload) SELECT
    id, created_at, subscription_id, payload
FROM AS_TABLE ($data);
`;
    logger.info('inserting event', event);
    logger.debug('$data', Event.asTypedCollection([event]))

    return session.execute({
        text,
        parameters: {
            $data: Event.asTypedCollection([event]),
        },
    });
}

export async function verifySubscription(
    session: QuerySession,
    subscription: Subscription,
): Promise<IExecuteResult> {
    const text = `
DECLARE $id AS Utf8;
DECLARE $verified_at AS Timestamp;
UPDATE ${SUBSCRIPTIONS_TABLE} SET verified = true, verified_at = $verified_at WHERE id = $id;
    `;
    logger.info('updating subscription', subscription);
    return session.execute({
        text,
        parameters: {
            $id: TypedValues.utf8(subscription.id),
            $verified_at: TypedValues.timestamp(subscription.verifiedAt!),
        },
    });
}

export async function deleteSubscription(
    session: QuerySession,
    id: string,
): Promise<IExecuteResult> {
    const text = `
DECLARE $id AS Utf8;
DELETE FROM ${SUBSCRIPTIONS_TABLE} WHERE id = $id;
`;
    logger.info('deleting subscription', id);
    return session.execute({
        text,
        parameters: {
            $id: TypedValues.utf8(id),
        },
    });
}
