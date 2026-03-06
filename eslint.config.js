/**
 * Google OAuth callback handler
 * This handles the redirect from Google after the user authorizes the app.
 * It receives the authorization code and passes it back to the mobile app via deep link.
 */
import type { Express, Request, Response } from "express";

export function registerGoogleOAuthRoutes(app: Express) {
  // Google redirects here after user authorizes
  // We then redirect back to the mobile app with the code
  app.get("/api/google/callback", (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const error = req.query.error as string | undefined;

    // Derive the Expo app URL from the current API server URL
    // API is on port 3000, Metro/Expo is on port 8081
    const apiHost = req.headers.host || "";
    const expoHost = apiHost.replace(/^3000-/, "8081-");
    const expoScheme = req.protocol === "https" ? "exps" : "exp";
    const expoBaseUrl = `${expoScheme}://${expoHost}`;

    if (error) {
      // Redirect back to app with error
      const appUrl = `${expoBaseUrl}/oauth/google?error=${encodeURIComponent(error)}`;
      res.send(`
        <html>
          <body>
            <p>Authorization failed: ${error}</p>
            <p>You can close this window and return to the app.</p>
            <script>
              window.location.href = "${appUrl}";
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    // Redirect back to the mobile app with the code
    // The app will then exchange the code for tokens via the tRPC API
    const appDeepLink = `${expoBaseUrl}/oauth/google?code=${encodeURIComponent(code)}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px 20px; background: #f5f5f5; }
            .card { background: white; border-radius: 16px; padding: 32px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
            h2 { color: #0a7ea4; margin-bottom: 8px; }
            p { color: #687076; }
            .btn { display: inline-block; background: #0a7ea4; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; margin-top: 16px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✓ Authorization Successful</h2>
            <p>Google Sheets has been connected to your Expense Tracker app.</p>
            <a href="${appDeepLink}" class="btn">Return to App</a>
            <p style="margin-top:16px;font-size:12px;color:#9BA1A6">If the app doesn't open automatically, tap the button above.</p>
          </div>
          <script>
            // Try to redirect automatically
            setTimeout(() => {
              window.location.href = "${appDeepLink}";
            }, 500);
          </script>
        </body>
      </html>
    `);
  });
}
