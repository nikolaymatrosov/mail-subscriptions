import type { QuerySession } from 'ydb-sdk/build/cjs/src/query/query-session'
import type { IExecuteResult } from 'ydb-sdk/build/cjs/src/query'
import { VERIFICATIONS_TABLE, Verification } from '../models'
import { logger } from '../logger'
import { TypedValues } from 'ydb-sdk'

export async function insertVerification(
    session: QuerySession,
    v: Verification,
): Promise<IExecuteResult> {
    const text = `
    DECLARE $data AS List<Struct<event_id: Utf8, email: Utf8, created_at: Timestamp, subscription_id: Utf8, sent_at: Optional<Timestamp>>>;
    INSERT INTO ${VERIFICATIONS_TABLE} (event_id, email, created_at, subscription_id, sent_at) SELECT
        event_id, email, created_at, subscription_id, sent_at
    FROM AS_TABLE ($data);
    `;
    logger.info('inserting verification', v);
    logger.info('inserting verification', { data: Verification.asTypedCollection([v]) });

    return session.execute({
        text,
        parameters: {
            $data: Verification.asTypedCollection([v]),
        },
    });
}

export function updateVerification(
    session: QuerySession,
    eventId: string,
    sentAt: Date,
): Promise<IExecuteResult> {
    const text = `
    DECLARE $event_id AS Utf8;
    DECLARE $sent_at AS Timestamp;
    UPDATE ${VERIFICATIONS_TABLE} SET sent_at = $sent_at WHERE event_id = $event_id;
    `;
    logger.info('updating verification', { eventId, sentAt });
    return session.execute({
        text,
        parameters: {
            $event_id: TypedValues.utf8(eventId),
            $sent_at: TypedValues.timestamp(sentAt),
        },
    });
}
