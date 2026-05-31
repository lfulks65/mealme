# MealMe — Supabase Auth Email Templates

Custom HTML email templates that override Supabase's default auth emails with a branded MealMe experience.

## Templates

| File | Purpose | Trigger |
|------|---------|---------|
| `confirm-signup.html` | Email confirmation for new sign-ups | User registers with email/password |
| `reset-password.html` | Password reset flow | User clicks "Forgot password" |
| `magic-link.html` | Magic link sign-in | User requests a magic link login |
| `invite.html` | Organization/family invitation | An existing member invites a new user |

## Supabase Template Variables

All templates have access to the following Go template variables (rendered by Supabase's auth service):

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The action URL — confirmation, reset, magic link, or invite acceptance |
| `{{ .Token }}` | The raw OTP token (useful for code-based flows) |
| `{{ .TokenHash }}` | Hashed token for URL-based verification |
| `{{ .SiteURL }}` | Your app's site URL (configured in `config.toml` under `[auth].site_url`) |
| `{{ .Email }}` | The recipient's email address |

### Usage in templates

Variables are rendered using Go's `text/template` syntax:

```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
<p>Sent to {{ .Email }}</p>
```

## Design System

- **Brand colors**: Primary green `#22c55e`, dark text `#1a1a1a`, light background `#f9fafb`
- **Logo**: Text-based `🍳 MealMe` in the header bar
- **Layout**: 600px max-width centered card with rounded corners and subtle shadow
- **CSS**: All styles are inline for maximum email client compatibility
- **Responsive**: Uses `max-width:600px;width:100%` so the card scales on mobile

## Customization

### Changing brand colors

Search and replace the hex values across all template files:

| Token | Default | Usage |
|-------|---------|-------|
| `#22c55e` | Primary green | Header background, CTA buttons |
| `#1a1a1a` | Dark text | Headings |
| `#f9fafb` | Light background | Page background |
| `#ffffff` | White | Card background, header text, button text |

### Changing the logo

Replace the `🍳 MealMe` text in the `<h1>` element inside the header `<td>` with an `<img>` tag pointing to a hosted logo:

```html
<img src="https://your-cdn.com/mealme-logo.png" alt="MealMe" width="120" style="display:block;" />
```

### Modifying copy

Each template's body content is in the `<td>` section after the header. Edit the `<h2>`, `<p>`, and `<a>` elements directly.

## Preview & Testing

### Local preview with Supabase CLI

1. Start the local Supabase stack:

   ```bash
   supabase start
   ```

2. Trigger an auth email (e.g., sign up a user via the local API or Studio at `http://localhost:54323`).

3. Check the email in **Inbucket** at `http://localhost:54324` — Supabase's local mail catcher.

### Preview HTML in a browser

Open any template file directly in a browser. The Supabase template variables (`{{ .ConfirmationURL }}`, etc.) will render as raw text, which is fine for visual layout checks.

For a more realistic preview, temporarily replace the variables with sample URLs:

```html
<!-- Replace -->
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
<!-- With -->
<a href="https://mealme.app/confirm?token=example">Confirm your email</a>
```

### Testing with Mailhog / Inbucket

The local Supabase dev environment uses [Inbucket](https://github.com/inbucket/inbucket) to capture emails. You can view the rendered HTML email directly in the Inbucket web UI.

## Integration with config.toml

These templates are referenced in `supabase/config.toml` under the `[auth.email]` section:

```toml
[auth.email]
template_path = "templates/confirm-signup.html"  # for signup confirmations
# Additional template paths are configured per auth flow
```

See the [Supabase docs](https://supabase.com/docs/guides/auth/auth-email-templates) for the full list of configurable template paths.
