# Offline international phone formatting

libphonenumber-js 1.13.15, MIT license (included), pinned npm distribution.
Upstream: https://gitlab.com/catamphetamine/libphonenumber-js
Package: https://registry.npmjs.org/libphonenumber-js/-/libphonenumber-js-1.13.15.tgz

The package SHA512 was checked against registry metadata before extraction.
provenance.json records package and shipped-asset integrity. The browser min
bundle includes country formatting metadata; only its source-map URL comment
was removed. No runtime download, CDN, telemetry or Node runtime is required.

phone-input.js uses AsYouType without a default country: a leading +country
code selects international formatting. Local numbers are not guessed/reformatted.
This is formatting, not live-number or national-plan acceptance validation.
Existing Rust contact validation remains authoritative. Preserve all vendor
bytes using the repository's .gitattributes rule for frontend/vendor/**.
