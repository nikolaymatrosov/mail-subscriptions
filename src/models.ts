import { declareType, snakeToCamelCaseConversion, TypedData, Types, withTypeOptions, Ydb } from 'ydb-sdk';
import { type ResultSet } from 'ydb-sdk/build/cjs/src/query';
import { IncomingHttpHeaders } from 'http'


export interface ISubscription {
    id: string;
    email: string;
    ip: string;
    verified: boolean;
    createdAt: Date;
    verifiedAt: Date | null;
}

export interface IEvent<T> {
    id: string;
    createdAt: Date;
    subscriptionId: string;
    payload: T;
}

export type ISubscriptionCreatedEvent = IEvent<ISubscriptionCreatedEventPayload>;
export type ISubscriptionVerifiedEvent = IEvent<ISubscriptionVerifiedEventPayload>;
export type IUnsubscribedEvent = IEvent<IUnsubscribedEventPayload>;

export interface ISubscriptionCreatedEventPayload {
    type: 'SubscriptionCreated';
    subscriptionId: string;
    email: string;
    createdAt: Date;
    headers: IncomingHttpHeaders;
}

export interface ISubscriptionVerifiedEventPayload {
    type: 'SubscriptionVerified';
    subscriptionId: string;
    verifiedAt: Date;
    headers: IncomingHttpHeaders;
}

export interface IUnsubscribedEventPayload {
    type: 'Unsubscribed';
    unsubscribedAt: Date;
    headers: IncomingHttpHeaders;
}

export const SUBSCRIPTIONS_TABLE = 'subscriptions';

@withTypeOptions({ namesConversion: snakeToCamelCaseConversion })
export class Subscription extends TypedData {
    @declareType(Types.UTF8)
    public id: string;

    @declareType(Types.UTF8)
    public email: string;

    @declareType(Types.UTF8)
    public ip: string;

    @declareType(Types.TIMESTAMP)
    public createdAt: Date;

    @declareType(Types.BOOL)
    public verified: boolean;

    @declareType(Types.optional(Types.TIMESTAMP))
    public verifiedAt: Date | null;


    constructor(data: ISubscription) {
        super(data);
        this.id = data.id;
        this.email = data.email;
        this.ip = data.ip;
        this.createdAt = data.createdAt;
        this.verified = data.verified;
        this.verifiedAt = data.verifiedAt;
    }

    static async from(resultSets: AsyncGenerator<ResultSet>): Promise<Subscription[]> {
        const res: Subscription[] = []
        for await (const resultSet of resultSets) {
            for await (const s of resultSet.rows) {
                res.push(new Subscription(s as ISubscription));
            }
        }
        return res;
    }
}

export const EVENTS_TABLE = 'events';

@withTypeOptions({ namesConversion: snakeToCamelCaseConversion })
export class Event<T> extends TypedData {
    @declareType(Types.UTF8)
    public id: string;

    @declareType(Types.TIMESTAMP)
    public createdAt: Date;

    @declareType(Types.UTF8)
    public subscriptionId: string;

    @declareType(Types.JSON_DOCUMENT,)
    public payload: T;

    constructor(data: IEvent<T>) {
        super(data);
        this.id = data.id;
        this.subscriptionId = data.subscriptionId;
        this.createdAt = data.createdAt;
        this.payload = data.payload;
    }

    getValue(propertyKey: string): Ydb.IValue {
        const val = super.getValue(propertyKey);
        if (propertyKey === 'payload') {
            return {
                textValue: JSON.stringify(val.textValue),
            }
        }
        return val;
    }
}

export class SubscriptionCreatedEvent extends Event<ISubscriptionCreatedEventPayload> {
    constructor(data: ISubscriptionCreatedEvent) {
        super(data);
    }
}

export class SubscriptionVerifiedEvent extends Event<ISubscriptionVerifiedEventPayload> {
    constructor(data: ISubscriptionVerifiedEvent) {
        super(data);
    }
}

export class UnsubscribedEvent extends Event<IUnsubscribedEventPayload> {
    constructor(data: IUnsubscribedEvent) {
        super(data);
    }
}

interface IVerification {
    eventId: string;
    email: string;
    createdAt: Date;
    subscriptionId: string;
    sentAt: Date | null;
}

export const VERIFICATIONS_TABLE = 'verifications';

@withTypeOptions({ namesConversion: snakeToCamelCaseConversion })
export class Verification extends TypedData {
    @declareType(Types.UTF8)
    public eventId: string;

    @declareType(Types.UTF8)
    email: string;

    @declareType(Types.UTF8)
    public subscriptionId: string;

    @declareType(Types.TIMESTAMP)
    public createdAt: Date;

    @declareType(Types.optional(Types.TIMESTAMP))
    public sentAt: Date | null;

    constructor(data: IVerification) {
        super(data);
        this.eventId = data.eventId;
        this.email = data.email;
        this.createdAt = data.createdAt;
        this.subscriptionId = data.subscriptionId;
        this.sentAt = data.sentAt;
    }

}
