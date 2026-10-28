# Agents Module

## Overview

Agents are internal handlers and administrators who manage CRM records and workflows. They are distinct from contractors: Agents operate the CRM, while contractors are external personnel represented in the system.

## Frontend Implementation

The Agents module is integrated into the single-page application router under `<div id="view-agents">`. Its directory uses a responsive Bootstrap 5 grid with a card for each Agent.

## UI Components

Each Agent card displays:

- Avatar
- Name
- Internal ID
- Security clearance badge
- Region
- Email link

## Backend Database Requirements (Action Item for Backend Lead)

Create a SQLite table named `Agents` with the following columns:

```sql
CREATE TABLE Agents (
    id TEXT PRIMARY KEY NOT NULL,
    full_name TEXT NOT NULL,
    internal_id TEXT NOT NULL UNIQUE,
    clearance_level TEXT NOT NULL,
    region TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);
```

Use UUID strings for `id`. Store `email` in a form suitable for an email link, and use `clearance_level` for the value displayed in the UI badge.
