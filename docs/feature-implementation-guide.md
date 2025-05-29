# 🛠️ Feature Implementation Guide  
_Adding “Guide Notes” – private notes that guides attach to bookings_

This walk-through shows **exactly how a new developer ships a complete feature** in Outfitter, from the first idea to the merged pull-request.  
Follow the same pattern for any future feature.

---

## 0 Scenario: “Guide Notes”

Guides need a place to jot private, internal notes (e.g. “Client prefers 7 AM start, bring extra decoys”).  
Requirements:

* Add optional, **tenant-scoped** textual notes per booking.
* Only **guides & admins** of the booking’s outfitter can CRUD notes.
* Notes are **never** visible to customers / public booking page.
* Audit log entry when a note is created, updated, or deleted.

---

## 1 Planning & Requirements Gathering

1. **Stakeholder interview** – confirm use-cases, privacy rules, UI location.  
2. **User stories**

   ```
   As a guide I can add/edit/delete a private note on a booking
   so I remember client preferences during the trip.
   ```
3. **Acceptance criteria**
   * POST `/api/bookings/:id/notes` stores note.
   * GET `/api/bookings/:id/notes` returns list (guide/admin only).
   * UI button on booking detail page.
   * Unit + API tests green; multi-tenant isolation verified.

4. **Tech impact check** – no external services; simple CRUD → ½ sprint.

Record all above in GitHub Issue **#123 Guide Notes**.

---

## 2 Database Schema Changes

1. Open `shared/schema.ts`.  
2. **Add table**

   ```ts
   export const guideNotes = pgTable("guide_notes", {
     id: serial("id").primaryKey(),
     bookingId: integer("booking_id")
       .notNull()
       .references(() => bookings.id, { onDelete: "cascade" }),
     authorId: varchar("author_id")
       .notNull()
       .references(() => users.id),
     body: text("body").notNull(),
     outfitterId: integer("outfitter_id")
       .notNull()
       .references(() => outfitters.id),
     createdAt: timestamp("created_at").defaultNow(),
     updatedAt: timestamp("updated_at").defaultNow()
   });
   ```

3. **Add relations**

   ```ts
   export const guideNotesRelations = relations(guideNotes, ({ one }) => ({
     booking: one(bookings, {
       fields: [guideNotes.bookingId],
       references: [bookings.id]
     }),
     author: one(users, {
       fields: [guideNotes.authorId],
       references: [users.id]
     })
   }));
   ```

4. **Zod schema**

   ```ts
   export const insertGuideNoteSchema = createInsertSchema(guideNotes).omit({
     id: true,
     createdAt: true,
     updatedAt: true
   });
   export type InsertGuideNote = z.infer<typeof insertGuideNoteSchema>;
   ```

5. Generate migration & push:

   ```bash
   npx drizzle-kit generate:pg
   npm run db:push
   ```

6. Update **ER diagram** (`docs/database_schema.md`) – add `guide_notes`.

---

## 3 Backend API Implementation

### 3.1 Storage Layer (`server/storage.ts`)

```ts
async function addGuideNote(
  outfitterId: number,
  input: InsertGuideNote
) {
  return db.insert(guideNotes)
    .values({ ...input, outfitterId })
    .returning();
}

async function listGuideNotes(
  outfitterId: number,
  bookingId: number
) {
  return db
    .select()
    .from(guideNotes)
    .where(and(
      eq(guideNotes.bookingId, bookingId),
      eq(guideNotes.outfitterId, outfitterId)
    ));
}
```

### 3.2 Routes (`server/routes/guideNotes.ts`)

```ts
router.post(
  "/bookings/:id/notes",
  requireAuth,
  addOutfitterContext,
  validate(z.object({ body: z.string().min(1) })),
  async (req, res) => {
    const bookingId = +req.params.id;
    const note = await storage.addGuideNote(req.context.outfitterId, {
      bookingId,
      authorId: req.user.id,
      body: req.body.body
    });
    await storage.logActivity("create_note", {
      bookingId,
      noteId: note.id
    }, req);
    res.status(201).json(note);
  }
);

router.get(
  "/bookings/:id/notes",
  requireAuth,
  addOutfitterContext,
  async (req, res) => {
    const notes = await storage.listGuideNotes(
      req.context.outfitterId,
      +req.params.id
    );
    res.json(notes);
  }
);
```

Mount route file in `server/index.ts`.

---

## 4 Frontend Component Development

1. **API helper**

   ```ts
   // lib/api.ts
   export function addGuideNote(bookingId: number, body: string) {
     return apiRequest("POST", `/api/bookings/${bookingId}/notes`, { body });
   }
   export function fetchGuideNotes(bookingId: number) {
     return apiRequest("GET", `/api/bookings/${bookingId}/notes`);
   }
   ```

2. **React hook**

   ```ts
   export function useGuideNotes(bookingId: number) {
     return useQuery({
       queryKey: ["guideNotes", bookingId],
       queryFn: () => fetchGuideNotes(bookingId)
     });
   }
   ```

3. **UI**

   *Edit `pages/Bookings/BookingDetail.tsx`*

   ```tsx
   const { data: notes } = useGuideNotes(booking.id);
   const addNote = useMutation({
     mutationFn: (body: string) => addGuideNote(booking.id, body),
     onSuccess: () => queryClient.invalidateQueries(["guideNotes", booking.id])
   });
   ```

   Add a **Notes** tab with:

   ```tsx
   <Textarea value={draft} onChange={...} />
   <Button onClick={() => addNote.mutate(draft)}>Save</Button>
   {notes?.map(n => (
     <NoteCard key={n.id} note={n} />
   ))}
   ```

4. Ensure **role check** – show tab only for `user.role !== 'customer'`.

---

## 5 Testing & Validation

### 5.1 Unit Tests

* Validate Zod schema rejects empty body.
* Storage methods return tenant-scoped data.

```ts
it("rejects empty note body", () =>
  expect(insertGuideNoteSchema.safeParse({ body: "" }).success).toBe(false));
```

### 5.2 API Tests (Supertest)

```ts
it("stores and retrieves notes for same tenant", async () => {
  const agent = await loginAs("guide@alpha.com");
  await agent.post("/api/bookings/1/notes").send({ body: "Bring dogs" }).expect(201);
  const { body } = await agent.get("/api/bookings/1/notes").expect(200);
  expect(body).toHaveLength(1);
  expect(body[0].body).toBe("Bring dogs");
});
```

Add cross-tenant leak test – user from Beta should receive **404/403**.

### 5.3 Frontend Tests (Vitest + React Testing Library)

* Render BookingDetail, mock `useGuideNotes`.
* Simulate typing note, click Save, expect mutation fired.

---

## 6 Documentation

1. **Update**  
   * `docs/database_schema.md` – add `guide_notes` table.  
   * `docs/development-guide.md` – mention note CRUD API.  
   * Public API reference (`docs/api/bookings.md`).  

2. **Changelog** – `docs/CHANGELOG.md`:

   ```
   ### Added
   - Guide Notes: private notes per booking (#123)
   ```

---

## 7 Code Review & Submission

1. **Branch** `feat/guide-notes`.  
2. **Self-check**

   ```bash
   npm run lint
   npm test
   ./test-api.sh     # smoke test
   ```

3. **Open PR** with template:
   * _What_ – “Guide Notes private notes CRUD”.
   * _Why_ – user story ref.
   * _How_ – schema + API + UI bullets.
   * Screenshots of UI / cURL.

4. **Reviewers** verify:
   * Tenant isolation.
   * Tests & coverage pass.
   * No secrets committed.
   * Docs updated.

5. **Merge** strategy: squash & merge, CI deploys to staging.

---

## 🎉 Done!

You have delivered a secure, tenant-aware “Guide Notes” feature fully tested and documented.  
Repeat these 7 stages for every new capability to keep Outfitter robust, maintainable, and developer-friendly.
