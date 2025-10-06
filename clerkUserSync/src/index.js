// Appwrite Function Code (index.js)
import { Client, Databases, ID } from 'node-appwrite';
import { Webhook } from 'svix';

export default async ({ req, res, log }) => {
  // 1. Get Clerk's secret from environment variables
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    log('Clerk webhook secret not found.');
    return res.json({ error: 'Internal server error' }, 500);
  }

  // 2. Verify the webhook signature
  const headers = req.headers;
  const payload = req.bodyRaw;
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let event;
  try {
    event = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    log('Webhook verification failed.');
    return res.json({ error: 'Verification failed' }, 400);
  }

  // 3. Handle the 'user.created' event
  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = event.data;

    // Initialize Appwrite SDK
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const database = new Databases(client);

    try {
      // 4. Create a document in the 'profiles' collection
      await database.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        'profiles', // your collection ID
        ID.unique(),
        {
          clerkUserId: id,
          email: email_addresses[0]?.email_address || null,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          credits: 0, // Give new users 0 credits initially
        }
      );
      log(`Successfully created profile for user ${id}`);
    } catch (error) {
      log(`Error creating Appwrite document: ${error.message}`);
      return res.json({ error: 'Failed to create user profile' }, 500);
    }
  }

  return res.json({ success: true });
};