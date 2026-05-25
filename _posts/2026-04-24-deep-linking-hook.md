---
layout: posts
title: "Building a Custom Deep Linking Hook in React"
excerpt: "Learn how to manage navigation state using deep linking in React applications."
categories: [react, javascript]
---

# Building a Custom Deep Linking Hook in React

Modern web applications are highly dynamic and state-driven. Dashboards, filters, search pages, and reporting tools all rely heavily on maintaining UI state across navigation.

However, many applications still struggle with common issues:

- State resets on page refresh
- Filtered views cannot be shared
- Browser navigation behaves inconsistently
- Debugging complex UI states becomes difficult

Deep linking solves these problems by moving application state into the URL.

---

# What is Deep Linking?

Deep linking is the practice of storing application state inside the URL so that a specific page state can be restored directly from the link.

Example:

```txt
/transactions?status=paid&amount=1000
```

````

Instead of opening a generic page, this URL opens a specific filtered state of the application.

This allows users to:

- Refresh the page without losing state
- Bookmark important views
- Share exact filtered results
- Navigate using browser history naturally

---

# Why Deep Linking Matters

Without deep linking:

- Filters reset on refresh
- Exact views cannot be shared
- Browser back/forward navigation becomes unreliable
- Reproducing bugs becomes difficult

With deep linking:

- Application state becomes shareable
- URLs become meaningful
- Navigation feels native
- Debugging becomes significantly easier

Deep linking improves both user experience and developer experience.

---

# The Core Idea

Instead of storing state only in:

- React component state
- Context
- localStorage

Store important UI state directly in the URL.

This creates applications that are:

- More predictable
- Easier to debug
- Easier to share
- More resilient to refreshes

---

# Hook Architecture

A reusable deep linking hook typically handles three responsibilities:

1. Read values from URL parameters
2. Validate and transform values
3. Synchronize URL state with UI state

The goal is to create a single source of truth between the UI and the URL.

---

# Implementation

## Custom Hook

```js
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useDeepLinking({ filtersConfig, onFilterChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({});

  // Read values from URL
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

    if (onFilterChange) {
      onFilterChange(urlFilters);
    }
  }, []);

  // Update URL parameters
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

      if (onFilterChange) {
        onFilterChange(newFilters);
      }
    },
    [searchParams]
  );

  return {
    filters,
    updateFilters,
  };
}
```

---

# Usage Example

```js
function TransactionList() {
  const { filters, updateFilters } = useDeepLinking({
    filtersConfig: [
      {
        key: "status",
        validator: (value) => ["paid", "pending"].includes(value),
      },
      {
        key: "amount",
        transform: (value) => Number(value),
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

# Key Benefits

## Shareable Application State

Users can share exact filtered views using a URL.

---

## Improved Browser Navigation

Back and forward navigation works naturally because state changes are reflected in browser history.

---

## Easier Debugging

Developers can reproduce issues instantly by opening the same URL.

---

## Stateless UI Patterns

The URL becomes the source of truth for page state, reducing dependency on local storage or temporary in-memory state.

---

# Common Challenges

## Long URLs

Avoid storing unnecessary or large data structures in query parameters.

Keep URLs minimal and readable.

---

## Invalid Query Parameters

Users may manually edit URLs.

Always validate and sanitize incoming parameters before applying them to the application state.

---

## Security Considerations

Sensitive information should never be stored in URLs.

Avoid exposing:

- Tokens
- Passwords
- Personal information
- Internal identifiers

---

# Best Practices

## Use Clear Parameter Names

Prefer:

```txt
?status=paid
```

Instead of:

```txt
?s=1
```

Readable URLs improve maintainability.

---

## Validate Every Parameter

Never trust query parameters directly.

Use validators and transformation logic consistently.

---

## Provide Default Fallbacks

Applications should behave gracefully even when parameters are missing or invalid.

---

## Ignore Unsupported Values

If a parameter is invalid, safely discard it instead of breaking the UI.

---

# When Not to Use Deep Linking

Deep linking is powerful, but not every UI state belongs in the URL.

Avoid using it for:

- Sensitive information
- Temporary modal states
- Large payloads
- Non-shareable UI interactions

Use deep linking only for meaningful, restorable application state.

---

# Final Thoughts

Deep linking is more than a convenience feature. It is a foundational architectural pattern for modern web applications.

By synchronizing application state with the URL, applications become:

- More predictable
- Easier to navigate
- Easier to debug
- Easier to share

For dashboards, filters, analytics pages, and dynamic interfaces, deep linking provides a significantly better user experience while simplifying state management.

When implemented correctly, it creates applications that feel reliable, transparent, and intuitive.

````
