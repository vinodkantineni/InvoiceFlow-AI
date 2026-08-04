import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables (from .env and .env.server)
dotenv.config();
if (fs.existsSync('.env.server')) {
  dotenv.config({ path: '.env.server' });
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Helper to initialize an authenticated Supabase client for a specific user request
const getSupabaseClient = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Missing Authorization header');

  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: authHeader // Pass the user's JWT so RLS works perfectly!
        }
      }
    }
  );
};

// Helper for Gemini AI Extraction with Multi-model Fallback & Robust JSON Cleaning
const extractWithGemini = async (base64Data, mimeType, apiKey, model = 'gemini-1.5-flash') => {
  if (!apiKey) {
    console.warn('extractWithGemini: No Gemini API Key provided.');
    return null;
  }
  
  // Try candidate models in order if the selected model fails or is unavailable for the API key
  const candidateModels = Array.from(new Set([
    model,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ].filter(Boolean)));

  const prompt = `Extract all invoice data from the following content and return JSON exactly matching this structure without any markdown blocks or backticks:
{
  "vendor": "Vendor Name",
  "invoiceNumber": "INV-123",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "billTo": "Customer Name",
  "lineItems": [{"desc": "Item 1", "qty": 1, "unitPrice": 100, "total": 100}],
  "subtotal": 100,
  "taxRate": 10,
  "taxAmount": 10,
  "discount": 0,
  "total": 110,
  "currency": "USD",
  "paymentTerms": "Net 30",
  "notes": "Thank you",
  "confidence": {
    "vendor": 95,
    "invoiceNumber": 95,
    "date": 90,
    "dueDate": 80,
    "total": 99,
    "overall": 92
  }
}`;

  for (const modelName of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      console.log(`[Backend AI] Attempting Gemini extraction with model '${modelName}'...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Backend AI] Error for model '${modelName}':`, response.status, errorData?.error?.message || errorData);
        continue;
      }
      
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText) continue;
      
      let cleanJson = '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      } else {
        cleanJson = rawText.trim();
      }
      
      const parsed = JSON.parse(cleanJson);
      console.log(`[Backend AI] Success extracting invoice with model '${modelName}': Vendor = ${parsed.vendor || 'Unknown'}`);
      return parsed;
    } catch (e) {
      console.error(`[Backend AI] Exception for model '${modelName}':`, e.message);
    }
  }

  console.error('[Backend AI] All Gemini model extraction attempts failed.');
  return null;
};

// --- ROUTE 1: Exchange Authorization Code for Tokens ---
app.post('/api/exchange-token', async (req, res) => {
  try {
    const { code, clientId, userId } = req.body;
    
    if (!code || !clientId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:5173/mail/callback' // Must exactly match the frontend redirect URI
    );

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Initialize authenticated Supabase client
    const supabase = getSupabaseClient(req);

    // Save tokens to the database
    // Note: In a true production app, you would encrypt these tokens before saving to DB.
    const { error: dbError } = await supabase
      .from('mail_connections')
      .update({ 
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token, // This is the crucial one for offline access
        connected_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (dbError) throw dbError;

    res.json({ success: true, message: 'Tokens securely exchanged and saved.' });

  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- ROUTE 2: Fetch and Sync Gmail Invoices ---
app.post('/api/sync-mail', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const supabase = getSupabaseClient(req);

    // 1. Get the user's refresh token from DB
    const { data: connection, error: connError } = await supabase
      .from('mail_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connError || !connection || !connection.refresh_token_encrypted) {
      return res.status(400).json({ error: 'No Gmail connection found. Please connect your account first.' });
    }

    // Get user settings for Gemini key
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Setup Google Auth Client
    const oauth2Client = new google.auth.OAuth2(
      connection.oauth_client_id,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:5173/mail/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token_encrypted
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Search for emails with PDF attachments
    // Instead of relying on "unread" and modifying the email (which requires invasive permissions),
    // we just fetch emails received since the last time we synced!
    let query = 'has:attachment filename:pdf';
    
    // If we have synced before, only look for emails after that date
    // Gmail after: takes an epoch timestamp in seconds
    if (connection.last_synced_at) {
      // Subtract 1 day just to be safe with timezone overlaps
      const afterEpoch = Math.floor(new Date(connection.last_synced_at).getTime() / 1000) - (24 * 60 * 60);
      query += ` after:${afterEpoch}`;
    } else {
      // If first time syncing, maybe just look at the last 7 days so we don't scan their entire history
      const lastWeekEpoch = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      query += ` after:${lastWeekEpoch}`;
    }
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10 // process in small batches
    });

    const messages = response.data.messages || [];
    let processedCount = 0;

    // Helper to recursively find PDF attachments in nested email parts
    const findPdfParts = (parts) => {
      let pdfs = [];
      if (!parts) return pdfs;
      for (const part of parts) {
        if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
          pdfs.push(part);
        }
        if (part.parts) {
          pdfs = pdfs.concat(findPdfParts(part.parts));
        }
      }
      return pdfs;
    };

    for (const msg of messages) {
      // Get the full message payload
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id
      });

      const payload = msgData.data.payload;
      
      // Some emails have attachments at the top level, others in parts
      const allParts = payload.parts ? payload.parts : [payload];
      const pdfParts = findPdfParts(allParts);

      // Find PDF attachments
      for (const part of pdfParts) {
        
        // --- PREVENT DUPLICATES ---
        // Check if we already processed an invoice with this exact filename from mail
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('user_id', userId)
          .eq('file_name', part.filename)
          .eq('source', 'mail')
          .maybeSingle();
          
        if (existing) {
          console.log(`Skipping duplicate attachment: ${part.filename}`);
          continue; // Skip this one!
        }

        // Download the attachment
          let fileData;
          if (part.body.attachmentId) {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: msg.id,
              id: part.body.attachmentId
            });
            fileData = Buffer.from(attachment.data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          } else if (part.body.data) {
            fileData = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          } else {
            console.log(`Skipping ${part.filename} - no data found.`);
            continue;
          }
          
          // Generate a unique filename
          const uniqueFileName = `${userId}/${Math.random().toString(36).substring(2)}.pdf`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(uniqueFileName, fileData, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (!uploadError) {
            
            // --- AUTOMATIC AI EXTRACTION ---
            let extractedData = null;
            let status = 'pending';
            let confidence = null;

            const apiKey = settings?.gemini_api_key_encrypted || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

            if (apiKey) {
              console.log(`[Backend Sync] Extracting AI data for ${part.filename}...`);
              extractedData = await extractWithGemini(
                fileData.toString('base64'),
                'application/pdf',
                apiKey,
                settings?.gemini_model
              );
              
              if (extractedData) {
                confidence = extractedData.confidence;
                status = (confidence?.overall || 0) < (settings?.confidence_threshold || 70) ? 'pending' : 'reviewed';
              }
            } else {
              console.warn(`[Backend Sync] Skipping AI extraction for ${part.filename} - No Gemini API Key configured in settings or .env.`);
            }

            // Insert fully extracted record into database
            await supabase.from('invoices').insert({
              user_id: userId,
              file_name: part.filename,
              file_path: uniqueFileName,
              file_type: 'application/pdf',
              file_size: fileData.length,
              source: 'mail',
              mail_source: 'gmail',
              status: status,
              extracted_data: extractedData,
              confidence: confidence
            });
            processedCount++;
          }
      }
    }

    // --- RETROACTIVE AI EXTRACTION FOR UNEXTRACTED MAIL INVOICES ---
    const apiKey = settings?.gemini_api_key_encrypted || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    let reextractedCount = 0;

    if (apiKey) {
      const { data: unextractedInvoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .is('extracted_data', null);

      if (unextractedInvoices && unextractedInvoices.length > 0) {
        console.log(`[Backend Sync] Found ${unextractedInvoices.length} unextracted invoice(s) in DB. Retroactively extracting AI data...`);
        for (const inv of unextractedInvoices) {
          if (!inv.file_path) continue;
          
          try {
            const { data: blob, error: downloadErr } = await supabase.storage
              .from('invoices')
              .download(inv.file_path);

            if (!downloadErr && blob) {
              const arrayBuffer = await blob.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString('base64');
              const extracted = await extractWithGemini(
                base64Data,
                inv.file_type || 'application/pdf',
                apiKey,
                settings?.gemini_model
              );

              if (extracted) {
                const conf = extracted.confidence;
                const newStatus = (conf?.overall || 0) < (settings?.confidence_threshold || 70) ? 'pending' : 'reviewed';

                await supabase.from('invoices').update({
                  extracted_data: extracted,
                  confidence: conf,
                  status: newStatus
                }).eq('id', inv.id);

                reextractedCount++;
              }
            }
          } catch (err) {
            console.error(`[Backend Sync] Retroactive extraction failed for invoice ${inv.id}:`, err.message);
          }
        }
      }
    }

    // Update last sync time
    await supabase.from('mail_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    const totalProcessed = processedCount + reextractedCount;
    const msgText = totalProcessed > 0
      ? `Successfully processed ${processedCount} new invoice(s) and extracted data for ${reextractedCount} existing invoice(s).`
      : 'Synced successfully. No new unextracted invoices found.';

    res.json({ 
      success: true, 
      processed: processedCount,
      reextracted: reextractedCount,
      message: msgText
    });

  } catch (error) {
    console.error('Error syncing mail:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Server running securely on http://localhost:${PORT}`);
});
