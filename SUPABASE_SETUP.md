# Supabase Authentication Setup

This guide will help you set up real Google authentication with Supabase for your Clearity app.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Wait for the project to be set up (this takes a few minutes)

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy your **Project URL** and **anon public** key
3. Update your `.env` file with these values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Configure Google OAuth

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** and click **Enable**
3. You'll need to set up a Google OAuth app:

### Setting up Google OAuth:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. Set the application type to **Web application**
6. Add authorized redirect URIs:
   - For development: `https://your-project-ref.supabase.co/auth/v1/callback`
   - For production: `https://your-domain.com/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

### Back in Supabase:

1. Paste the **Client ID** and **Client Secret** into the Google provider settings
2. Set the redirect URL to: `https://your-project-ref.supabase.co/auth/v1/callback`
3. Click **Save**

## 4. Test the Authentication

1. Start your development server: `npm run dev`
2. Try clicking "Login with Google" - it should redirect to Google's OAuth flow
3. After successful authentication, you should be redirected back to your app

## 5. Optional: Email Authentication

Email/password authentication is already configured and will work out of the box. Users will receive confirmation emails when they sign up.

## 6. User Management

You can view and manage users in your Supabase dashboard under **Authentication** > **Users**.

## Troubleshooting

- Make sure your environment variables are loaded correctly
- Check the browser console for any error messages
- Verify that your Google OAuth redirect URIs match exactly
- Ensure your Supabase project is fully initialized before testing

## Security Notes

- Never commit your `.env` file to version control
- Use different Supabase projects for development and production
- Regularly rotate your API keys
- Set up Row Level Security (RLS) policies for your database tables