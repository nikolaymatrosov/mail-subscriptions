import { SESv2Client } from '@aws-sdk/client-sesv2';
import { type FinalizeRequestMiddleware } from '@aws-sdk/types/dist-types/middleware'
import { HttpRequest } from '@smithy/protocol-http'


export function SesClientFactory(token: string) {
    const client = new SESv2Client({
        region: 'ru-central1',
        endpoint: 'https://postbox.cloud.yandex.net',
    })

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const middleware: FinalizeRequestMiddleware<any, any> = next => {
        return async args => {
            if (!HttpRequest.isInstance(args.request)) {
                return next(args)
            }
            args.request.headers['X-YaCloud-SubjectToken'] = token
            return next(args)
        }
    }

    client.middlewareStack.removeByTag('HTTP_AUTH_SCHEME')
    client.middlewareStack.removeByTag('HTTP_SIGNING')
    client.middlewareStack.addRelativeTo(middleware, {
        name: 'ycAuthMiddleware',
        tags: ['YCAUTH'],
        relation: 'after',
        toMiddleware: 'retryMiddleware',
        override: true
    })
    return client
}
