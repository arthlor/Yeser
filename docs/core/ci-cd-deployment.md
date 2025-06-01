# Yeşer - CI/CD & Deployment

## 1. Introduction

This document outlines the Continuous Integration/Continuous Deployment (CI/CD) pipeline and deployment processes for the Yeşer application. Our strategy leverages Expo Application Services (EAS) for client application builds and submissions, and Supabase CLI for backend (database schema, Edge Functions) deployments. GitHub Actions are used for CI.

## 2. Expo Application Services (EAS)

EAS is central to our mobile application lifecycle management.

### 2.1. EAS Build
*   **Role:** Compiles and bundles the React Native application into installable binaries (`.apk`/`.aab` for Android, `.ipa` for iOS).
*   **Build Profiles (`eas.json`):** We define multiple build profiles in `eas.json` to cater to different environments:
    *   `development`: Creates development builds with `expo-dev-client` for local development and testing with tools like Flipper. Includes developer tools and bypasses JS minification for easier debugging.
    *   `preview`: Generates internal distribution builds suitable for QA, UAT, and TestFlight/Google Play Internal Testing. Can be configured for ad-hoc distribution.
    *   `production`: Creates production-ready, optimized binaries for submission to the Apple App Store and Google Play Store.
*   **Environment Variables & Secrets:** Secrets (e.g., `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, Google OAuth Client IDs) are managed per profile using EAS Secrets in the Expo dashboard, referenced in `eas.json` or injected directly during the build process.

### 2.2. EAS Update (Over-the-Air Updates)
*   **Role:** Allows pushing updates to the JavaScript bundle and assets directly to users' devices without requiring a new store submission. Ideal for rapid bug fixes, UI tweaks, and minor feature updates.
*   **Channels:** Updates are published to specific channels (e.g., `production`, `preview`, `development`). The app is configured to check for updates on its designated channel.
*   **Workflow:** `eas update --branch <channel-name> --message "Update message"`

### 2.3. EAS Submit
*   **Role:** Automates the process of submitting application binaries (built via `eas build`) to the Apple App Store and Google Play Store.
*   Requires store credentials and metadata to be configured.

## 3. Client Application Deployment Workflow

### 3.1. Branching Strategy (Example)
*   `main`: Represents the production-ready code. Merges to `main` trigger production builds.
*   `develop`: Integration branch for features. Merges to `develop` can trigger preview builds.
*   `feature/<feature-name>`: Individual feature branches, merged into `develop` after review.

### 3.2. Build Process
1.  **Code Changes:** Develop features on `feature` branches, then merge to `develop`.
2.  **Trigger Build:**
    *   Manually: `eas build -p <android|ios> --profile <production|preview|development>`
    *   Automated (via CI): See Section 5.
3.  **Monitor Build:** Track progress on the EAS dashboard.
4.  **Distribute/Submit:**
    *   **Preview Builds:** Share build links from EAS or distribute via TestFlight/Google Play Internal Testing.
    *   **Production Builds:** Use `eas submit -p <android|ios> --profile production --latest` (or specify build ID) to submit to stores.

## 4. Supabase Backend Deployment

Backend changes primarily involve schema migrations and potentially Edge Functions.

### 4.1. Schema Migrations
*   **Tool:** Supabase CLI.
*   **Local Development:**
    1.  Initialize Supabase locally: `supabase init`.
    2.  Start local Supabase services: `supabase start`.
    3.  Make schema changes using Supabase Studio (local) or SQL.
    4.  Generate migration file: `supabase db diff -f <migration_name>`.
    5.  Review and refine the generated SQL migration file in `supabase/migrations/`.
*   **Applying Migrations:**
    *   Locally: `supabase migration up` (to apply all pending migrations) or `supabase db reset` (to reset and apply all from scratch).
    *   Staging/Production: It's highly recommended to have separate Supabase projects for staging and production.
        1.  Link CLI to the target project: `supabase link --project-ref <your-project-ref>` (get ref from Supabase dashboard URL).
        2.  Apply migrations: `supabase migration up`.
        *   **Caution:** Always test migrations thoroughly in a staging environment before applying to production.

### 4.2. Edge Functions
*   **Development:** Develop functions locally within the `supabase/functions/` directory.
*   **Deployment:**
    1.  Link CLI to the target project (if not already linked).
    2.  Deploy a specific function: `supabase functions deploy <function_name> --project-ref <your-project-ref>`.
    3.  Secrets for Edge Functions (e.g., API keys) are managed in the Supabase dashboard under Edge Functions settings for the specific function.

## 5. Continuous Integration (CI) with GitHub Actions

Automated checks are run on pushes and pull requests to `main` and `develop` branches.

```yaml
# .github/workflows/ci.yml
name: Yeşer CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18' # Match project's Node version
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint
      run: npm run lint # Assumes lint script in package.json

    - name: Format Check
      run: npm run format:check # Assumes format check script (e.g., prettier --check .)

    - name: Run Unit & Component Tests
      run: npm test -- --coverage # Assumes test script, add coverage if configured

    # Optional: Trigger EAS Build for 'develop' or 'main' branches on push
    # Ensure EXPO_TOKEN is set as a GitHub secret
    - name: Setup EAS CLI and Trigger Build
      if: (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop') && github.event_name == 'push'
      uses: expo/expo-github-action@v8
      with:
        eas-version: latest
        token: ${{ secrets.EXPO_TOKEN }}
    #  run: |
    #    if [ "$GITHUB_REF_NAME" == "main" ]; then
    #      eas build --platform all --profile production --non-interactive --auto-submit-with-profile production # or --no-wait
    #    elif [ "$GITHUB_REF_NAME" == "develop" ]; then
    #      eas build --platform all --profile preview --non-interactive --no-wait
    #    fi
    # Note: Auto-submit or specific build commands need careful consideration and setup.
    # The above 'run' block for EAS build is commented out as it requires more specific logic for auto-submit or handling build IDs.
    # A simpler approach for CI might be to just ensure EAS CLI can authenticate, or run builds with --no-wait and handle submission manually.
```

## 6. Versioning Strategy

Application versioning is managed in `app.json`:
*   `expo.version`: Publicly visible version string (e.g., "1.0.0"). Follow Semantic Versioning (SemVer).
*   `expo.android.versionCode`: Incremental integer for Android builds.
*   `expo.ios.buildNumber`: Incremental string (often integer) for iOS builds.

These should be updated systematically for each new release.

## 7. Best Practices & Future Enhancements

*   **Secrets Management:** Use GitHub Actions secrets for `EXPO_TOKEN` and any other CI/CD sensitive keys. Manage EAS build secrets via the Expo dashboard.
*   **Build Reproducibility:** Lock dependency versions using `package-lock.json` or `yarn.lock`.
*   **Thorough Testing:** Always test builds from `eas build --profile production` (or a `preview` build from the same commit) before store submission or pushing critical OTA updates.
*   **Incremental OTA Rollouts:** For significant OTA updates, consider phased rollouts if supported by your update channel configuration or a feature flagging system.
*   **Monitoring:** Regularly monitor EAS build dashboards, GitHub Actions, and Supabase logs for any issues.
*   **Future Enhancements:**
    *   Fully automate EAS builds and submissions on merge to `main` (for production) and `develop` (for preview/TestFlight).
    *   Integrate Supabase migration application into a CI/CD pipeline for staging/production environments (requires careful scripting and security considerations).
    *   Automated E2E tests as part of the CI pipeline.

This CI/CD and deployment strategy aims for a balance of automation, control, and reliability for the Yeşer application.
