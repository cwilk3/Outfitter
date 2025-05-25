
# Experience Creation Debug Report

## Issue Summary
Experience creation succeeds (ID 3: "Thermal Hog Hunt") but add-ons are not being properly associated.

## Request Details
```javascript
// Form Values
{
  "name": "Thermal Hog Hunt",
  "description": "",
  "duration": "5",
  "price": "250",
  "capacity": "5",
  "category": "other_hunting",
  "locationId": 24,
  "images": [],
  "availableDates": [],
  "rules": [],
  "amenities": [],
  "tripIncludes": [],
  "addons": []
}

// Add-ons State
[{
  "name": "Thermal Rifle",
  "description": "",
  "price": 150,
  "isOptional": true,
  "inventory": 5,
  "maxPerBooking": 5
}]
```

## API Response
```javascript
{
  "id": 3,
  "name": "Thermal Hog Hunt",
  "description": "Experience description",
  "duration": 5,
  "price": "250.00",
  "capacity": 5,
  "locationId": 24,
  "category": "other_hunting",
  "images": [],
  "availableDates": ["2025-07-01T05:00:00.000Z", ...]
}
```

## Route Analysis
Current implementation attempts to use `/api/experience-addons/` but server expects `/api/experiences/${experienceId}/addons`

### Affected Files:
1. client/src/pages/Experiences.tsx:
   - Line 154: `const addonResponse = await fetch(/api/experience-addons/${experience.id});`
   - Line 242: `const addonResponse = await fetch(/api/experience-addons/${selectedExperience.id});`

### Authentication Context
```javascript
{
  "user": {
    "id": "zddwhpv725",
    "email": "crwhattrick03@gmail.com",
    "role": "admin",
    "outfitterId": 1
  },
  "isAuthenticated": true
}
```

## Resolution Steps
1. Update client-side API endpoint from `/api/experience-addons/` to `/api/experiences/${experienceId}/addons`
2. Verify tenant isolation middleware is properly handling the request
3. Ensure add-on creation triggers after successful experience creation

## Success Criteria
- Experience creation succeeds (✓)
- Add-ons are properly associated with experience (×)
- Tenant context is maintained throughout request (✓)
- Authentication verification passes (✓)
