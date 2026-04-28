---
layout: posts
title: "Building a Custom Deep Linking Hook in React"
excerpt: "Learn how to manage navigation state using deep linking."
categories: [react, javascript]
---

# 🚀 Building a Custom Deep Linking Hook in React

Modern web applications are no longer simple pages—they are dynamic, state-driven experiences. Whether it’s filters, dashboards, or search results, users expect the app to remember exactly where they left off.

But here’s the problem:

Most apps lose state on refresh  
 Filters can’t be shared  
 Navigation becomes inconsistent

This is where **deep linking** becomes a game changer.

---

## 🔗 What is Deep Linking?

Deep linking means storing your application state directly in the **URL**, so users can:

- Bookmark it
- Share it
- Reload without losing context

### Example:

```

/transactions?status=paid&amount=1000

```

Instead of just opening a page, this URL opens a **specific state of the app**.

---

## Why Deep Linking Matters

Without deep linking:

- Filters reset on refresh
- Can't share exact views
- Back/forward buttons break
- Debugging becomes painful

With deep linking:

- State lives in the URL
- Shareable links
- Browser navigation works
- Easy debugging

---

## The Idea

Instead of storing state in:

- `localStorage`
- React state only

Store it in the **URL**

This makes your app:

- Stateless
- Predictable
- Shareable

---

## ⚙️ Hook Architecture

We need a hook that:

1. Reads URL parameters
2. Validates them
3. Syncs them with UI state

---

## Implementation (JavaScript)

```js
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useDeepLinking({ filtersConfig, onFilterChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({});

  // Read from URL
  useEffect(() => {
    const urlFilters = {};

    filtersConfig.forEach(({ key, validator, transform }) => {
      const value = searchParams.get(key);

      if (value) {
        const isValid = validator ? validator(value) : true;

        if (isValid) {
          urlFilters[key] = transform ? transform(value) : value;
        }
      }
    });

    setFilters(urlFilters);
    onFilterChange && onFilterChange(urlFilters);
  }, []);

  // Update URL
  const updateFilters = useCallback(
    (newFilters) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      setSearchParams(params);
      setFilters(newFilters);
      onFilterChange && onFilterChange(newFilters);
    },
    [searchParams]
  );

  return { filters, updateFilters };
}
```

---

## 🧪 Usage Example

```js
function TransactionList() {
  const { filters, updateFilters } = useDeepLinking({
    filtersConfig: [
      {
        key: "status",
        validator: (v) => ["paid", "pending"].includes(v),
      },
      {
        key: "amount",
        transform: (v) => Number(v),
      },
    ],
  });

  return (
    <div>
      <button onClick={() => updateFilters({ status: "paid" })}>Paid</button>
    </div>
  );
}
```

---

## Key Benefits

### Shareable URLs

Users can copy & share exact filtered views

### Browser Navigation

Back and forward buttons work naturally

### Debugging

Reproduce issues instantly via URL

### Stateless UI

No dependency on storage

---

## ⚠️ Challenges

### 1. Long URLs

Keep only necessary params

### 2. Invalid Values

Always validate inputs

### 3. Security

Never expose sensitive data in URLs

---

## Best Practices

- Use clean parameter names
  `?status=paid`

- Validate all inputs

- Provide default fallback values

- Ignore invalid parameters

---

## 🎯 When NOT to Use Deep Linking

Avoid deep linking for:

- Sensitive data (tokens, passwords)
- Temporary UI states
- Large data payloads

---

## Final Thoughts

Deep linking is not just a feature—it’s a **fundamental design pattern** for modern web applications.

It transforms your app from:

Stateful → Stateless
Complex → Predictable
Isolated → Shareable

If you’re building dashboards, filters, or any dynamic UI—**deep linking should be your default approach.**

---
