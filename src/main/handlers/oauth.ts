import { shell } from 'electron';
import http from 'node:http';
import { URL } from 'node:url';
import { supabase } from '../lib/supabase';

// OAuth configuration
const LOOPBACK_PORT = 1213; // Using 1213 to avoid conflicts with dev server on 1212
const LOOPBACK_HOST = '127.0.0.1';
const REDIRECT_URI = `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}/auth/callback`;

// Track active OAuth session
let activeServer: http.Server | null = null;

export interface OAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}

export async function startGoogleOAuth(): Promise<OAuthResult> {
  console.log('[Main] Starting Google OAuth with loopback server...');

  try {
    // Close any existing server
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }

    // Step 1: Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URI,
        // PKCE is enabled by default in our supabase client config
      },
    });

    if (error) {
      console.error('[Main] Supabase OAuth error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      console.error('[Main] No OAuth URL received from Supabase');
      return { success: false, error: 'No OAuth URL received' };
    }

    console.log('[Main] OAuth URL generated:', data.url);

    // Step 2: Create promise that resolves when OAuth completes
    const oauthPromise = new Promise<OAuthResult>((resolve) => {
      // Step 3: Start loopback server to handle callback
      const server = http.createServer(async (req, res) => {
        console.log('[Main] Loopback server received request:', req.url);

        // Only handle callback URLs
        if (!req.url?.startsWith('/auth/callback')) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        try {
          // Parse the callback URL
          const callbackUrl = new URL(req.url, `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}`);
          const code = callbackUrl.searchParams.get('code');
          const error = callbackUrl.searchParams.get('error');

          console.log('[Main] Callback received:', { hasCode: !!code, error });

          // Handle OAuth error
          if (error) {
            console.error('[Main] OAuth callback error:', error);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Failed</title></head>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            activeServer = null;
            resolve({ success: false, error: `OAuth error: ${error}` });
            return;
          }

          // Handle missing code
          if (!code) {
            console.error('[Main] No authorization code in callback');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Failed</title></head>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>No authorization code received.</p>
                  <p>You can close this window.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            activeServer = null;
            resolve({ success: false, error: 'No authorization code received' });
            return;
          }

          // Step 4: Exchange code for session using the same Supabase client
          console.log('[Main] Exchanging authorization code for session...');
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Main] Code exchange failed:', exchangeError);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Failed</title></head>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>Error: ${exchangeError.message}</p>
                  <p>You can close this window.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            activeServer = null;
            resolve({ success: false, error: exchangeError.message });
            return;
          }

          // Success! Session created
          if (sessionData?.session) {
            console.log('[Main] OAuth successful, user:', sessionData.session.user.email);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Successful</title></head>
                <body>
                  <h1>Authentication Successful!</h1>
                  <p>Welcome, ${sessionData.session.user.email}!</p>
                  <p>You can close this window.</p>
                  <script>setTimeout(() => window.close(), 2000);</script>
                </body>
              </html>
            `);

            server.close();
            activeServer = null;
            resolve({
              success: true,
              user: sessionData.session.user,
              session: sessionData.session,
            });
          } else {
            console.error('[Main] No session created from code exchange');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Failed</title></head>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>No session was created.</p>
                  <p>You can close this window.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            activeServer = null;
            resolve({ success: false, error: 'No session created' });
          }
        } catch (callbackError) {
          console.error('[Main] Callback handler error:', callbackError);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error. You can close this window.');
          
          server.close();
          activeServer = null;
          resolve({ success: false, error: (callbackError as Error).message });
        }
      });

      // Handle server errors
      server.on('error', (serverError) => {
        console.error('[Main] Loopback server error:', serverError);
        server.close();
        activeServer = null;
        resolve({ success: false, error: `Server error: ${serverError.message}` });
      });

      // Start the server
      server.listen(LOOPBACK_PORT, LOOPBACK_HOST, () => {
        console.log(`[Main] Loopback server listening on ${REDIRECT_URI}`);
        activeServer = server;
      });

      // Set timeout to avoid hanging indefinitely
      setTimeout(() => {
        if (activeServer) {
          console.log('[Main] OAuth timeout, closing server');
          server.close();
          activeServer = null;
          resolve({ success: false, error: 'OAuth timeout after 5 minutes' });
        }
      }, 5 * 60 * 1000); // 5 minute timeout
    });

    // Step 4: Open system browser to OAuth URL
    console.log('[Main] Opening system browser for OAuth...');
    await shell.openExternal(data.url);

    // Step 5: Wait for OAuth to complete
    return await oauthPromise;

  } catch (error) {
    console.error('[Main] OAuth initialization error:', error);
    
    // Clean up server if it exists
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }
    
    return { success: false, error: (error as Error).message };
  }
}

// Helper function to clean up OAuth server (called when app quits)
export function cleanupOAuth(): void {
  if (activeServer) {
    console.log('[Main] Cleaning up OAuth server...');
    activeServer.close();
    activeServer = null;
  }
}