# Admin messages

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/wiadomosci?status=&q=&page=`, `/admin/wiadomosci/:id` | Client only | Admin | `src/app/features/admin/messages/` | A1, S8 |

## Purpose

Read and manage contact messages, then reply from your own mail client.

## Layout

Master–detail on wide screens, separate pages below 960 px.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Wiadomości                                                               │
│ [Nowe (3)] [Przeczytane] [Odpowiedziane] [Archiwum] [Spam]  [Szukaj…]    │
├───────────────────────────────┬──────────────────────────────────────────┤
│ ● Anna Nowak       2 godz.    │ Anna Nowak · anna@firma.pl · Firma X     │
│   Projekt · Backend i API  EN │ Projekt lub współpraca · Backend i API   │
│   Potrzebujemy API do…        │ Budżet: 10 000–30 000 zł · Termin: 3 mies│
│ ○ Jan K.           wczoraj    │ Język: angielski · 14.10.2026, 09:12     │
│   Konsultacja                 │ ───────────────────────────────────────  │
│   …                           │ message text (pre-wrap)                  │
│                               │                                          │
│                               │ [Odpowiedz e-mailem] [Oznacz jako        │
│                               │  odpowiedziane] [Archiwizuj] [Spam] [Usuń]│
└───────────────────────────────┴──────────────────────────────────────────┘
```

## Content and translation keys (Polish only)

`admin.messages.title` Wiadomości · `.status.NEW` Nowe · `.READ` Przeczytane · `.REPLIED` Odpowiedziane · `.ARCHIVED` Archiwum · `.SPAM` Spam · `.search` Szukaj… · `.reply` Odpowiedz e-mailem · `.markReplied` Oznacz jako odpowiedziane · `.archive` Archiwizuj · `.spam` Oznacz jako spam · `.delete` Usuń · `.deleteConfirm` Usunąć wiadomość od „{name}”? Tej operacji nie można cofnąć. · `.empty` Brak wiadomości w tym widoku. · `.locale.pl` polski · `.locale.en` angielski · `.select` Wybierz wiadomość z listy.

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/messages?status=&q=&page=&size=20` | Page of `{ id, name, email, company, topic, serviceTitle, locale, status, preview, createdAt }`, newest first; `q` searches name, email, company, message |
| `GET /api/v1/admin/messages/{id}` | Full message incl. `budgetRange`, `timeline` (option codes) |
| `PATCH /api/v1/admin/messages/{id}` `{ status }` | Change status |
| `DELETE /api/v1/admin/messages/{id}` | Delete permanently |

## Behaviour and states

- Opening a `NEW` message sets it to `READ` automatically.
- "Odpowiedz e-mailem" opens `mailto:` with subject `Re: <topic label>` and the original message quoted, in the message's language (labels from `en.json` for English messages). After clicking, the button suggests "Oznacz jako odpowiedziane".
- Budget and timeline codes are shown with their Polish labels.
- Status tab counts come from the same list endpoint (`X-Total-Count` header) or a counts field.
- Selecting another message with the keyboard: `j`/`k` move, `Enter` opens (optional nicety).

## Technical hints

- Backend `AdminMessagesController` with Spring Data `Pageable`; search with `ilike` on the listed columns (the volume is small).
- Deleting is permanent; the retention job also deletes old messages automatically.

## Acceptance criteria

- [ ] Tabs filter by status; search narrows the list; pagination works.
- [ ] Opening a new message marks it read and updates the sidebar badge.
- [ ] Reply opens the mail client with the quoted message in the visitor's language.
- [ ] Status changes and deletion work, with confirmation for deletion.

## Out of scope

Sending replies from the admin, threads, attachments.

## Implementation notes (A9, 2026-10-15)

- Tabs: "Wszystkie" plus one per status; counts come from the `counts` field of the list response (per status,
  not narrowed by the search).
- The opened message is a child route (`/admin/wiadomosci/:id`) so the list keeps its query string; below 960 px
  list and detail are separate views. `j`/`k` navigation is not implemented.
