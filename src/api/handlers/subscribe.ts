import { generateId } from '../../ids'
import { createSubscription, getSubscriptionByEmail, insertEvent, listSubscriptionsByIp } from '../db'
import { Subscription, SubscriptionCreatedEvent } from '../../models'
import { Request, RequestHandler, Response } from 'express'
import { logger } from '../../logger'
import { YdbError } from 'ydb-sdk'
import { getIp } from './common'

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || '';
const CAPTCHA_URL = 'https://smartcaptcha.yandexcloud.net/validate';


function validEmail(email: string): boolean {
  const re = /^[\w\-.]+(\+[\w\-.]+)?@([\w-]+\.)+[\w-]{2,}$/
  return re.test(email)
}

export const subscribe: RequestHandler = async (req: Request, res: Response) => {
  const driver = req.apiGateway.context.driver;
  const ip = getIp(req);
  const email = req.body.email;
  const token = req.body.captchaToken;

  if (!validEmail(email)) {
    res.status(400).json({
      message: 'Invalid email'
    });
    return
  }

  if (!token) {
    res.status(400).json({
      message: 'Captcha token is required'
    });
    return
  }
  const captcha = await validateCaptcha(token, ip);
  if (!captcha) {
    res.status(400).json({
      message: 'Captcha validation failed'
    });
    return
  }

  const newSub = newSubscription(ip, email)
  try {
    const result = await driver.queryClient.do({
      fn: async (session) => {
        await session.beginTransaction({ serializableReadWrite: {} });

        const subscriptions = await getSubscriptionByEmail(session, newSub.email);

        if (subscriptions.length > 0) {
          await session.rollbackTransaction();
          return {
            message: 'Subscription already exists'
          }
        }
        const fromIp = await listSubscriptionsByIp(session, newSub.ip);
        if (fromIp.length > 2) {
          await session.rollbackTransaction();
          return {
            message: 'Too many subscriptions from this IP'
          }
        }

        await createSubscription(session, newSub);
        await insertEvent(session, new SubscriptionCreatedEvent({
          id: generateId(),
          createdAt: new Date(),
          subscriptionId: newSub.id,
          payload: {
            type: 'SubscriptionCreated',
            subscriptionId: newSub.id,
            email: newSub.email,
            createdAt: newSub.createdAt,
            headers: req.headers,
          },
        }));
        await session.commitTransaction();
      }
    });

    if (result) {
      res.status(400).json(result);
      return
    }

    res.json({
      message: 'Subscription created'
    });
    return

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
}

function validateCaptcha(token: string, ip: string): Promise<boolean> {
  return fetch(CAPTCHA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: captchaRequest(token, ip)
  })
    .then(res => res.json() as unknown as CaptchaResponse)
    .then(data => {
      logger.info('Captcha response', { data });
      return data.status === 'ok'
    });
}

interface CaptchaResponse {
  status: 'ok' | 'failed'
  message: string
  host: string
}

function captchaRequest(token: string, ip: string): string {
  return `secret=${CAPTCHA_SECRET}&token=${token}&ip=${ip}`;
}

function newSubscription(ip: string, email: string): Subscription {
  return new Subscription({
    id: generateId(),
    ip: ip,
    email: email,
    verified: false,
    createdAt: new Date(),
    verifiedAt: null,
  })
}
