# 📊 Outfitter Database – Entity-Relationship Diagram

```mermaid
erDiagram
  %% =======================
  %%  CORE MULTI-TENANT ROOT
  %% =======================
  outfitters {
    int id PK
    varchar name
    boolean isActive
    timestamp createdAt
  }

  %% ================
  %%  AUTH & SECURITY
  %% ================
  users {
    varchar id PK
    varchar email UNIQUE
    roleEnum role
    varchar firstName
    varchar lastName
    int outfitterId* FK
  }

  user_outfitters {
    int id PK
    varchar userId FK
    int outfitterId* FK
    roleEnum role
  }

  sessions {
    varchar sid PK
    jsonb sess
    timestamp expire
  }

  %% ============
  %%  OPERATIONS
  %% ============
  locations {
    int id PK
    varchar name
    text city
    text state
    int outfitterId* FK
  }

  experiences {
    int id PK
    varchar name
    decimal price
    int capacity
    int locationId FK
    categoryEnum category
    int outfitterId* FK
  }

  experience_locations {
    int id PK
    int experienceId FK
    int locationId FK
  }

  experience_guides {
    int id PK
    int experienceId FK
    varchar guideId FK
    boolean isPrimary
  }

  experience_addons {
    int id PK
    int experienceId FK
    varchar name
    decimal price
  }

  addon_inventory_dates {
    int id PK
    int addonId FK
    date date
    int usedInventory
  }

  customers {
    int id PK
    varchar firstName
    varchar lastName
    varchar email
    int outfitterId* FK
  }

  bookings {
    int id PK
    varchar bookingNumber UNIQUE
    int experienceId FK
    int customerId FK
    bookingStatusEnum status
    decimal totalAmount
    int outfitterId* FK
  }

  booking_guides {
    int id PK
    int bookingId FK
    varchar guideId FK
  }

  payments {
    int id PK
    int bookingId FK
    decimal amount
    paymentStatusEnum status
    varchar transactionId UNIQUE
    int outfitterId* FK
  }

  documents {
    int id PK
    varchar name
    varchar path
    int bookingId FK
    int customerId FK
    varchar guideId FK
    int outfitterId* FK
  }

  activities {
    int id PK
    varchar action
    jsonb details
    varchar userId FK
    int outfitterId* FK
  }

  settings {
    int id PK
    varchar companyName
    varchar companyEmail
    int outfitterId* FK
  }

  %% =====================
  %%  RELATIONSHIPS (CARD)
  %% =====================
  outfitters ||--o{ users : "has"
  outfitters ||--o{ user_outfitters : ""
  outfitters ||--o{ locations : ""
  outfitters ||--o{ experiences : ""
  outfitters ||--o{ customers : ""
  outfitters ||--o{ bookings : ""
  outfitters ||--o{ payments : ""
  outfitters ||--o{ documents : ""
  outfitters ||--o{ activities : ""
  outfitters ||--|| settings : "1-1"

  users ||--o{ user_outfitters : ""
  users ||--o{ booking_guides : ""
  users ||--o{ experience_guides : ""
  users ||--o{ documents : ""

  locations ||--o{ experiences : ""

  experiences ||--o{ experience_locations : ""
  experiences ||--o{ experience_guides : ""
  experiences ||--o{ experience_addons : ""
  experiences ||--o{ bookings : ""

  experience_addons ||--o{ addon_inventory_dates : ""

  customers ||--o{ bookings : ""
  customers ||--o{ documents : ""

  bookings ||--o{ booking_guides : ""
  bookings ||--o{ payments : ""
  bookings ||--o{ documents : ""
```

### 🏷️ Legend
* `PK` – Primary Key  
* `FK` – Foreign Key  
* Fields marked with **`*`** are tenant scoping columns (`outfitterId`).  
* Enumerations (e.g., `roleEnum`, `bookingStatusEnum`) are defined via PostgreSQL enums.

---

## 🏢 Multi-Tenant Architecture Explained
1. **Tenant Root:** Each outfitter (business) has a single record in the `outfitters` table. Its primary key `id` serves as the **tenant key**.  
2. **Row Isolation:** Most operational tables embed an `outfitterId` FK (highlighted with `*`). _Every_ query must include this column to guarantee data isolation.  
3. **Cross-Tenant Users:** A user can belong to multiple tenants via the `user_outfitters` junction, allowing guides/admins to switch accounts securely.  
4. **Automatic Scoping:** Middleware decodes the JWT, injects `req.context.outfitterId`, and the data-access layer auto-appends `WHERE outfitter_id = $1`.  
5. **Cascade Rules:** Relationships use `ON DELETE CASCADE` where orphan cleanup is safe (e.g., deleting a booking cleans up `booking_guides`).  

This design ensures that **no data leaks between outfitters**, while still supporting shared authentication and flexible user assignments.
