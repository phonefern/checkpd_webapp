# Thai ID card handoff for the mobile app

This webapp saves the latest physical Thai ID card scan in `checkpd.thai_id_cards`. The Thai ID is the primary key. A scan can exist before the person has registered in the mobile app.

## Required mobile registration flow

1. Complete phone OTP and create the normal `checkpd.users` registration record.
2. Ask for the 13-digit Thai ID and validate its checksum.
3. Look up the matching Thai ID card record. If one exists, show its card details and photo for the person to confirm before continuing.
4. Only link the card to the new user when the Thai ID is an exact match and there is exactly one eligible user record. Never guess between duplicate users.
5. If no card exists, or the person declines the preview, continue the normal manual-registration path.

## Integration boundary

- The mobile app owns phone OTP, registration UI, and creating/updating `checkpd.users`.
- The webapp owns the local reader, card scan persistence, and the admin-only review screen.
- Do not expose service-role credentials, raw card photos, or direct table write access in the mobile client.
- The card table is a current snapshot only: a repeat scan updates the same Thai ID record. It is not an audit log.
