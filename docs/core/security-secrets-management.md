# Yeşer - Security & Secrets Management

## 1. Introduction

Security is a critical aspect of the Yeşer application. This document outlines the measures taken to protect user data, manage sensitive information (secrets), and ensure the overall integrity and safety of the application. Our approach is multi-layered, encompassing client-side, server-side (Supabase), and operational practices.

## 2. Secrets Management

Proper management of secrets is crucial to prevent unauthorized access.

### 2.1. Client-Side Secrets (`.env`)
*   **Supabase Credentials:** The Supabase URL (`SUPABASE_URL`) and public anonymous key (`SUPABASE_ANON_KEY`) are stored in a `.env` file at the root of the project.
*   **Google OAuth Client IDs:** Client IDs for Google OAuth (iOS, Android, Web - if applicable for different Supabase configurations) are also stored in the `.env` file.
*   **Access in Code:** These variables are prefixed with `EXPO_PUBLIC_` (e.g., `EXPO_PUBLIC_SUPABASE_URL`) to be bundled by Expo and made available in the client application via `expo-constants.manifest.extra` or `process.env` (depending on the Expo SDK version and setup).
*   **Gitignore:** The `.env` file is **strictly gitignored** to prevent accidental check-in of secrets to the repository.

### 2.2. Build-Time Secrets (EAS Build)
*   For production and preview builds, secrets from the local `.env` file are configured as **EAS Build Secrets** in the Expo dashboard. This ensures that sensitive keys are securely injected during the build process without being stored in the repository.

### 2.3. Server-Side Secrets (Supabase Dashboard)
*   **Google OAuth Client Secret:** The Google OAuth Client Secret is configured directly and securely within the Supabase Dashboard under Authentication > Providers.
*   **JWT Secret:** Supabase manages its own JWT signing secret, which is not exposed to the client or developers directly.
*   **Database Passwords & API Keys:** Supabase manages underlying database credentials and other internal API keys securely.
*   **Email Templates & Providers:** Any API keys for email providers (e.g., for password resets) are configured within the Supabase dashboard.

## 3. Authentication & Authorization

### 3.1. Supabase Authentication
*   Yeşer uses Supabase Auth for user authentication, supporting email/password and Google OAuth.
*   Supabase Auth issues JSON Web Tokens (JWTs) upon successful login. These JWTs are automatically managed by the Supabase client library and sent with each API request to authenticate the user.

### 3.2. Google OAuth Flow
*   The Google OAuth flow is initiated client-side using libraries like `expo-auth-session` or `expo-apple-authentication` (for Apple Sign-In, if implemented).
*   Secure redirect URIs are configured in the Supabase dashboard (Authentication > URL Configuration) and in the Google Cloud Console for the OAuth client IDs.
*   The client receives an ID token or access token from Google, which is then passed to Supabase's `signInWithIdToken` or `signInWithOAuth` (using the token) method to complete the authentication and create a Supabase session.

### 3.3. Row Level Security (RLS)
*   RLS is **enabled and enforced** on all sensitive Supabase tables (e.g., `profiles`, `gratitude_entries`).
*   Policies are defined to ensure that users can only access and modify their own data. For detailed RLS policy definitions, refer to the `docs/backend-database-setup.md` document.
*   RLS is a cornerstone of our data protection strategy within the database. Policies extend to any views or functions that access table data, ensuring consistent permission enforcement.
*   Database functions (RPCs) generally execute with the permissions of the calling user. For specific operations requiring elevated privileges, functions can be defined with `SECURITY DEFINER`, a practice used cautiously and with clearly defined scope (see `backend-database-setup.md` for details on RPCs like `update_user_streak`).

## 4. Data Privacy & Protection

### 4.1. Minimalist Data Collection
*   Yeşer adheres to the principle of minimalist data collection. Only data essential for the app's functionality is collected: user email (for authentication), and user-generated content (gratitude entries).
*   Optional data includes username and reminder preferences.

### 4.2. User Data Control
*   Users have ownership of their data.
*   **Account Deletion:** A mechanism for users to delete their account and associated data is planned. This involves deleting the user from `auth.users`. Due to foreign key constraints with `ON DELETE CASCADE` (as defined in `backend-database-setup.md`), this action will automatically cascade to delete related records in `public.profiles` and `public.streaks`. Associated `gratitude_entries` also have a cascading delete relationship with `auth.users`.
*   **Data Export (Conceptual):** A future feature could allow users to export their gratitude entries (e.g., via a conceptual `export-user-data` Supabase Edge Function).

### 4.3. Encryption in Transit
*   All communication between the Yeşer client application and the Supabase backend is secured using **HTTPS (TLS/SSL)** by default, ensuring data is encrypted during transit.

### 4.4. Encryption at Rest
*   Supabase manages encryption at rest for the PostgreSQL database using industry-standard practices, protecting data stored on their servers.

## 5. Client-Side Security Measures

### 5.1. Secure Token Storage
*   The Supabase client library (`@supabase/supabase-js`) handles the secure storage and management of JWTs. It typically uses `AsyncStorage` on React Native, which provides persistent, unencrypted, key-value storage. While `AsyncStorage` itself is not encrypted, the JWTs are signed and can be verified by Supabase. For higher security needs, `expo-secure-store` could be considered for storing refresh tokens if manual token management were implemented, but Supabase client handles this.

### 5.2. Input Validation (Zod)
*   **Zod** is utilized for schema declaration and validation of data on the client-side and potentially in Supabase Edge Functions.
*   This includes validating user inputs in forms, data being prepared for API calls, and environment variables on the client-side. This ensures data integrity before data leaves the client, helps prevent common injection vulnerabilities, and improves overall data handling robustness. Zod's TypeScript-first approach allows for deriving static types from validation schemas (`z.infer<typeof schema>`), enhancing code reliability and developer experience.
*   For backend logic within PL/pgSQL functions (RPCs), input validation and data integrity are primarily enforced by PostgreSQL's strong typing system, table constraints (checks, foreign keys, unique constraints), and explicit validation logic coded within the SQL functions themselves. This ensures robust validation at the data layer.

## 6. Supabase Platform Security

Yeşer benefits from the inherent security features provided by the Supabase platform, including:
*   Managed infrastructure with regular security updates.
*   Protection against common web attacks (e.g., DDoS mitigation).
*   Secure handling of database credentials and API keys.
*   Regular security audits and compliance efforts by Supabase.
*   Support for **database triggers**, which can automate data integrity checks and security-related logging or actions (e.g., automatically updating `updated_at` timestamps, managing streak calculations consistently).

## 7. Regular Reviews & Updates

*   **Dependency Auditing:** Regularly run `npm audit` (or `yarn audit`) to identify and address known vulnerabilities in project dependencies.
*   **Software Updates:** Keep Expo SDK, React Native, Supabase client libraries, and other dependencies updated to their latest stable and secure versions.
*   **Policy Review:** Periodically review security policies (RLS, access controls) and this document to ensure they align with current best practices and application features.

## 8. Incident Response (Conceptual)

While a formal incident response plan is beyond the current scope for a small project, basic principles would involve:
1.  **Identification:** Detecting a potential security incident.
2.  **Containment:** Limiting the scope and impact of the incident.
3.  **Eradication:** Removing the cause of the incident.
4.  **Recovery:** Restoring affected systems and services.
5.  **Lessons Learned:** Analyzing the incident to improve security measures.
Communication with users would be prioritized if personal data is compromised, in line with applicable regulations.
