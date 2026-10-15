# Contact

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/kontakt` (PL), `/en/contact` (EN), query `?topic=&service=&project=` | SSR (form hydrates) | Public | `src/app/features/contact/` | S1, B4, Turnstile and SMTP configuration |

## Purpose

Let anyone start a conversation with as little effort as possible: four fields, then a reply by e-mail.

## Layout

The redesign ([docs/redesign/HANDOFF.md](../../redesign/HANDOFF.md) §8, [DIRECTION.md](../../../DIRECTION.md)): the
same form sits at the end of the home page (`#kontakt`) and on this page. Below 900px the two columns stack.

```
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Masz projekt?                │ ┌ form card (ink-700, 24px corners) ──────┐ │
│ Porozmawiajmy.  (h1 here,    │ │ Dotyczy usługi: … (only with ?service=)  │ │
│                  h2 on home) │ │ Imię i nazwisko *      E-mail *          │ │
│ lead                         │ │ Czego potrzebujesz? *                    │ │
│ pospieszynski.michal@…       │ │ [                                      ] │ │
│ LinkedIn · GitHub            │ │ ☐ Zgadzam się … Polityka prywatności *   │ │
│ ● availability (if visible)  │ │ (honeypot, hidden) (Turnstile)           │ │
│                              │ │ (Wyślij wiadomość)                       │ │
│                              │ └──────────────────────────────────────────┘ │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

The e-mail, social links and availability are on this page only; the home section shows the lead and the e-mail.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `contact.title` | Kontakt | Contact |
| `contact.heading` | Masz projekt? Porozmawiajmy. | Have a project? Let’s talk. |
| `contact.lead` | Opisz krótko, czego potrzebujesz. Odpiszę z pytaniami albo wstępną wyceną. | Briefly describe what you need. I’ll reply with questions or a first estimate. |
| `contact.aboutService` | Dotyczy usługi: {service} | About the service: {service} |
| `contact.field.name` | Imię i nazwisko | Name |
| `contact.field.email` | E-mail | Email |
| `contact.field.message` | Czego potrzebujesz? | What do you need? |
| `contact.field.consent` | Zgadzam się na przetwarzanie moich danych w celu odpowiedzi na wiadomość. | I agree to my data being processed to reply to this message. |
| `contact.privacyLink` | Polityka prywatności | Privacy policy |
| `contact.projectRef` | Nawiązuję do projektu „{title}”. | Regarding the project "{title}". |
| `contact.submit` / `.sending` | Wyślij wiadomość / Wysyłanie… | Send message / Sending… |
| `contact.success.title` | Wiadomość wysłana | Message sent |
| `contact.success.text` | Dziękuję! Odpowiem w ciągu dwóch dni roboczych na adres {email}. | Thank you! I'll reply to {email} within two working days. |
| `contact.success.again` | Wyślij kolejną wiadomość | Send another message |
| `contact.errors.required` | To pole jest wymagane. | This field is required. |
| `contact.errors.nameLength` | Imię i nazwisko powinno mieć od 2 do 120 znaków. | Your name should be 2 to 120 characters long. |
| `contact.errors.email` | Podaj poprawny adres e-mail – na niego wyślę odpowiedź. | Enter a valid email address – I'll reply to it. |
| `contact.errors.messageLength` | Wiadomość powinna mieć od 20 do 5000 znaków. | The message should be 20 to 5,000 characters long. |
| `contact.errors.consent` | Zaznacz zgodę, żeby można było odpowiedzieć. | Tick the consent box so I can reply. |
| `contact.errors.rateLimit` | Wysłano zbyt wiele wiadomości. Spróbuj ponownie za godzinę albo napisz na {email}. | Too many messages sent. Try again in an hour or email {email}. |
| `contact.errors.bot` | Nie udało się potwierdzić, że wiadomość wysyła człowiek. Odśwież stronę i spróbuj ponownie. | We couldn't confirm the message was sent by a person. Reload the page and try again. |
| `contact.errors.server` | Nie udało się wysłać wiadomości z powodu błędu serwera. Twój tekst jest zachowany – spróbuj ponownie albo napisz na {email}. | The message couldn't be sent because of a server error. Your text is still here – try again or email {email}. |

## Data

Services for the select: `GET /api/v1/public/services?lang=` (only `id`, `title` used). Availability and links from `ProfileStore`.

`POST /api/v1/public/contact`

```ts
interface ContactRequest {
  locale: 'pl' | 'en';
  topic: 'PROJECT' | 'CONSULTATION' | 'OTHER';
  name: string;                 // 2–120
  email: string;                // valid, max 254
  company?: string;             // max 160
  serviceId?: string;           // only for PROJECT
  budgetRange?: string;         // option code, only for PROJECT
  timeline?: string;            // option code, only for PROJECT
  message: string;              // 20–5000
  consent: true;
  turnstileToken: string;
  website?: string;             // honeypot, must be empty
}
```

Responses: `202 { id }`; `400` ProblemDetail with `errors[]` (localised by `locale`); `403` Turnstile failed; `429` rate limited (5 per hour per hashed IP).

## Behaviour and states

- The form (`ContactFormComponent`, `app-contact-form`) collects name, e-mail, message and consent. The request's
  `topic` comes from the page: `OTHER` on home; on this page `?topic=` (default `PROJECT`). Company, budget and
  timeline are no longer asked for; the API keeps accepting them as optional.
- Prefill from query: `service` (an active service id) is sent as `serviceId` and named above the fields with
  `contact.aboutService`; `project` adds `contact.projectRef` with the project title as the first line of the
  message (title from `GET /projects/{slug}`; ignored if not found). Unknown values are dropped.
- Validation: per field after it is left and on submit; on submit with errors, focus moves to the first invalid field.
- Sending: button disabled with `contact.sending`.
- Success: the form is replaced with the success message (`role="status"`, focus on its heading); "Wyślij kolejną
  wiadomość" resets the form and focuses the name field.
- Failure: field errors mapped from `errors[]` (focus on the first); `403`/`429`/`5xx` show the matching message
  above the button and keep all input.
- Without JavaScript: the form is server-rendered but needs JS to submit (Turnstile requires it); a note with the
  e-mail address is shown until the app runs.

## SEO

- Title `Kontakt – Imię Nazwisko` / `Contact – Your Name`. Alternates `/kontakt` ↔ `/en/contact`.

## Technical hints

### Frontend
- Reactive typed form (`FormGroup<ContactForm>`), validators mirroring the backend limits.
- Turnstile: load `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` only in the browser on the pages with the form, once the form comes within 400px of the viewport (an `IntersectionObserver` after `afterNextRender`; on home most visits never load it). Render with `execution: 'execute'` and `language: lang`: the challenge runs only on submit (a widget that has never run is executed without a reset; every wait ends after 20 s with the "could not confirm" message); reset after any failed submit.
- The honeypot input `website` is off-screen (`position:absolute; left:-10000px`), `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`.
- Turnstile is in the CSP only for the pages with the form (`FORM_PATHS` in `src/server-security.ts`).

### Backend (feature `contact`)
- `PublicContactController.submit()` → `ContactService`:
  1. Bucket4j check by `ipHash` (salted SHA-256 of `CF-Connecting-IP`) → 429.
  2. Honeypot filled → return 202 without storing (don't tell bots).
  3. Turnstile `siteverify` with secret and remote IP → 403 on failure.
  4. Bean Validation (localised with `locale`).
  5. Save `ContactMessage` (status `NEW`), publish `ContactMessageReceived`.
- `@TransactionalEventListener(AFTER_COMMIT) @Async` sends: owner notification (Polish template, includes all fields and a link to `/admin/wiadomosci/<id>`), and the auto-reply in `locale` using `autoreplySubject`/`autoreplyBodyMd` from settings (`{name}` placeholder). Retry 3× with backoff; failures are logged, the message stays in the inbox.
- Templates in `resources/mail/` (Thymeleaf text+HTML) per language.
- Scheduled job deletes messages older than the retention period (`site.contact.retention=P12M`).

## Accessibility

- Required fields marked with `*` and `aria-required`; each error is linked with `aria-describedby` and announced
  (`aria-live="polite"`).
- Ids are prefixed per page (`home-contact-*`, `contact-*`), so the form can appear once per page.
- The consent text links to the privacy policy (new tab).

## Acceptance criteria

- [ ] A valid message in either language returns 202, is stored with its `locale`, notifies the owner and sends an auto-reply in that language.
- [ ] `?service=<id>&project=<slug>` names the service above the form and adds the project reference line; unknown values are ignored.
- [ ] Client and server validation messages match and are localised; on submit the first invalid field takes focus.
- [ ] Filled honeypot → 202, nothing stored, no email.
- [ ] Sixth message within an hour from the same IP → 429 with the localised message.
- [ ] Turnstile failure → 403 with the localised message; user input is kept.
- [ ] The Turnstile script loads only on the pages with the form (home and contact), once the form is near the viewport.
- [ ] No "job offer" option; the form is about projects, consultations and other topics only.

## Out of scope

File attachments, calendar booking, live chat.

## Implementation notes (S8, 2026-10-15)

- Validation is explicit in `ContactService` with message keys (`contact.errors.*` in `messages*.properties`), the
  same texts as the frontend; the controller switches the locale to the body's `locale` first. Extra keys:
  `contact.errors.nameLength`, `.companyLength`, `.option`, `contact.requiredNote`, `contact.noscript`,
  `contact.field.website` (honeypot label).
- Budget and timeline are language-neutral codes: `UNSURE | SMALL | MEDIUM | LARGE | XLARGE` and
  `UNSURE | ASAP | QUARTER | LATER`; labels per language in `contact.budget.*` / `contact.timeline.*`.
- Mail is plain text for now (owner notification in Polish; auto-reply from settings with `{name}`), sent after
  commit with three attempts. Thymeleaf HTML templates are left for later.
- The "needs JavaScript" note is not a `<noscript>` (its content breaks hydration): it is rendered on the server and
  removed once the app runs.
- Turnstile: the public site key comes from `TURNSTILE_SITE_KEY` on the web server (TransferState to the browser);
  without it, and in the API without `TURNSTILE_SECRET_KEY` outside production, Cloudflare's always-pass test keys
  are used. The route-specific CSP is not set yet: it belongs with the security headers in I2.

## Implementation notes (redesign, 2026-10-15)

- The form moved into `ContactFormComponent`, shared by home (topic `OTHER`) and this page. The topic radios,
  company, service select, budget and timeline fields and the error summary were removed (handoff §8: the
  prototype's fields plus consent); the backend contract is unchanged, and so are the honeypot, rate limit and
  Turnstile checks. Their translation keys were removed.
