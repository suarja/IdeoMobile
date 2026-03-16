import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret)
      throw new Error('CLERK_WEBHOOK_SECRET not set');

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');
    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let event: { type: string; data: { id: string } };
    try {
      event = wh.verify(body, {
        'svix-id': svixId!,
        'svix-timestamp': svixTimestamp!,
        'svix-signature': svixSignature!,
      }) as typeof event;
    }
    catch {
      return new Response('Invalid signature', { status: 400 });
    }

    if (event.type === 'user.created') {
      await ctx.runMutation(internal.gamification.initNewUser, { userId: event.data.id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
