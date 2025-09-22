# Visitor QR Payload Schema

This document captures the compact QR payload used for overnight visitor check-ins. The goal is to minimise QR density so that security scanners on commodity devices decode in under 250 ms while still providing enough data to look up the invitation server-side.

## Encoding Strategy

- **Invite identifier** – the Supabase generated UUID is Base32 encoded (RFC 4648 alphabet without padding). This trims the identifier from 36 to 26 characters while remaining lossless.
- **Guest name** – trimmed to 40 characters after collapsing internal whitespace. The name is included for human cross-checking only.
- **Dates** – check-in/out dates are emitted in a compact `YYYYMMDD` format.
- **Versioning** – `v` is included to allow future schema upgrades without ambiguity.
- All optional form fields (guest phone, emergency contact, special notes, purpose) are deliberately omitted to keep the payload small and to avoid leaking sensitive information if a QR code is shared inadvertently.

## Payload Structure

| Key | Type | Description |
| --- | ---- | ----------- |
| `v` | number | Schema version. Currently always `1`. |
| `i` | string | Base32 encoded invite UUID. 26 characters, uppercase. |
| `g` | string | Guest display name, max 40 characters. |
| `ci` | string | Check-in date in `YYYYMMDD`. |
| `co` | string | Check-out date in `YYYYMMDD`. |

The payload is encoded as a minified JSON string to keep QR modules dense and interoperable with existing scanner SDKs.

### Example

```json
{"v":1,"i":"F5DMN2G7N5RTM6H9J8Q9K3T4WA","g":"Ada Lovelace","ci":"20250115","co":"20250117"}
```

## Performance Validation

A Vitest benchmark (`tests/visitors-qr.test.ts`) executes 1,000 decode cycles against the payload above and asserts that total parsing time stays below 250 ms on Apple M-series and modern Android class hardware. The same test also confirms Base32 round-tripping so guard staff can trust the identifier.

Run the verification with:

```bash
pnpm vitest run tests/visitors-qr.test.ts
```

This test is part of the CI matrix to ensure future schema changes preserve the performance budget.
