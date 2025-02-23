import { Driver, TokenAuthService } from 'ydb-sdk'
import { logger } from '../logger'
import { SesClientFactory } from './ses-client'
import { SendEmailCommand, SendEmailRequest, SESv2Client } from '@aws-sdk/client-sesv2'
import { FunctionHandler, } from '@yandex-cloud/function-types/dist/src/functionHandler'
import { ISubscriptionCreatedEventPayload, Verification } from '../models'
import * as handlebars from 'handlebars'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { insertVerification, updateVerification } from './db'

type Event = Record<string, any>;

let endpoint = process.env.YDB_ENDPOINT;
let database = process.env.YDB_DATABASE;

async function send(driver: Driver, sesClient: SESv2Client, event: Event) {
    const payload = extractPayload(event);
    if (payload === null) {
        return;
    }
    const verification = new Verification({
        eventId: event.key[0],
        email: payload.email,
        subscriptionId: payload.subscriptionId,
        createdAt: new Date(),
        sentAt: null,
    })
    // Use two transactions to insert verification and send email
    await driver.queryClient.do({
        fn: async (session) => {
            return insertVerification(session, verification)
        }
    })

    // If sending email fails, we will not update the sent_at field
    return driver.queryClient.do({
        fn: async (session) => {

            const input = composeEmailReq(payload.email, payload.subscriptionId);
            const sendCmd = new SendEmailCommand(input);
            try {
                const sesMsg = await sesClient.send(sendCmd)

                logger.info(`Email sent to ${payload.email}, messageId: ${sesMsg.MessageId}`);

                const sentAt = new Date();
                return updateVerification(session, verification.eventId, sentAt);
            } catch (e) {
                logger.error(`Error sending email to ${payload.email}`, { error: e });
            }

        }
    })
}

function extractPayload(msg: Record<string, any>): ISubscriptionCreatedEventPayload | null {
    if (msg.newImage === undefined || msg.newImage?.payload === undefined) {
        return null;
    }
    if (msg.newImage?.payload.type !== 'SubscriptionCreated') {
        return null;
    }

    return msg.newImage?.payload as ISubscriptionCreatedEventPayload;
}

export const handler: FunctionHandler<Event> = async (event, context: any) => {
    logger.info('Received event', { event });
    if (context.token === undefined || context.token.access_token === undefined) {
        logger.error('Token is not provided');
        return {
            statusCode: 401,
            body: 'Unauthorized'
        }
    }
    const token = context.token?.access_token as string;

    const authService = new TokenAuthService(token);

    const driver = new Driver({ endpoint, database, authService, logger: logger });
    const timeout = 3000;
    if (!await driver.ready(timeout)) {
        logger.error(`Driver has not become ready in ${timeout}ms!`);
        return {
            statusCode: 500,
            body: 'Internal Server Error'
        }
    }

    const sesClient = SesClientFactory(token);

    await send(driver, sesClient, event);

    return {
        statusCode: 200,
        body: 'OK'
    }
}

const rawTemplate = fs.readFileSync(path.join(__dirname, '../templates/verification-email.html'), 'utf8');
const template = handlebars.compile(rawTemplate);

function composeEmailReq(email: string, subscriptionId: string): SendEmailRequest {
    return {
        FromEmailAddress: 'verify@blog.nikolaymatrosov.ru',
        Destination: {
            ToAddresses: [email]
        },
        Content: {
            Simple: {
                Subject: {
                    Data: 'Подтвердите подписку'
                },
                Body: {
                    Text: {
                        Data: `Подтвердите подписку на новые посты в блоге https://nikolaymatrosov.ru по ссылке: https://blog.nikolaymatrosov.ru/verify/${subscriptionId}`
                    },
                    Html: {
                        Data: template({ subscriptionId })
                    }
                },
            }
        }
    }
}

