// Appwrite Function Code (index.js) - FIXED HEADERS
import { Client, Databases, ID } from 'node-appwrite';
import { Webhook } from 'svix';

export default async ({ req, res, log }) => {
  // Check if required env vars are present
  if (!process.env.APPWRITE_ENDPOINT || 
      !process.env.APPWRITE_PROJECT_ID || 
      !process.env.APPWRITE_API_KEY || 
      !process.env.APPWRITE_DATABASE_ID || 
      !process.env.APPWRITE_COLLECTION_ID_PROFILES ||
      !process.env.CLERK_WEBHOOK_SECRET) {
    log('Error: Missing required environment variables.');
    return res.json({ error: 'Internal server configuration error.' }, 500);
  }

  // Log all headers to debug
  log('All headers received:');
  log(JSON.stringify(req.headers, null, 2));

  // Get the Svix headers - try different cases
  const svixId = req.headers['svix-id'] || 
                 req.headers['Svix-Id'] || 
                 req.headers['SVIX-ID'];
                 
  const svixTimestamp = req.headers['svix-timestamp'] || 
                        req.headers['Svix-Timestamp'] || 
                        req.headers['SVIX-TIMESTAMP'];
                        
  const svixSignature = req.headers['svix-signature'] || 
                        req.headers['Svix-Signature'] || 
                        req.headers['SVIX-SIGNATURE'];

  log(`Svix ID: ${svixId}`);
  log(`Svix Timestamp: ${svixTimestamp}`);
  log(`Svix Signature: ${svixSignature}`);

  if (!svixId || !svixTimestamp || !svixSignature) {
    log('Error: Missing Svix headers');
    log('Available headers:', Object.keys(req.headers).join(', '));
    return res.json({ error: 'Missing webhook headers' }, 400);
  }

  // Get the raw body
  const payload = req.bodyRaw;
  
  if (!payload) {
    log('Error: req.bodyRaw is empty.');
    return res.json({ error: 'Empty request body' }, 400);
  }

  log(`Raw body received (first 200 chars): ${payload.substring(0, 200)}`);

  // Verify the webhook signature using Svix
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    
    const evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    log('Webhook signature verified successfully.');
    
    // Parse the event
    if (!evt || typeof evt !== 'object' || !evt.type) {
      log('Invalid event object from webhook verification.');
      return res.json({ error: 'Invalid payload format' }, 400);
    }

    log(`Event type: ${evt.type}`);

    // Handle user.created event
    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      
      log(`Handling 'user.created' event for user ID: ${id}`);
      log(`Email: ${email_addresses[0]?.email_address}`);
      log(`Name: ${first_name} ${last_name}`);

      // Initialize Appwrite SDK
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const database = new Databases(client);

      // Create a document
      const newProfile = await database.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_ID_PROFILES,
        ID.unique(),
        {
          clerkUserId: id,
          email: email_addresses[0]?.email_address || null,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          profileImage: image_url || null,
          credits: 0,
        }
      );

      log(`Successfully created profile for user ${id}`);
      log(`Profile document ID: ${newProfile.$id}`);
    } else {
      log(`Unhandled event type: ${evt.type}`);
    }

    return res.json({ success: true });

  } catch (error) {
    log(`Error processing webhook: ${error.message}`);
    log(`Error stack: ${error.stack}`);
    if (error.message.includes('verify')) {
      log('Webhook signature verification failed');
      return res.json({ error: 'Invalid signature' }, 401);
    }
    return res.json({ error: 'Function failed during processing' }, 500);
  }
};