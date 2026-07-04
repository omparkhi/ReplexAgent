# Example Corp Legacy Site

**URL:** https://old.example-corp.com
**Generated:** 2026-07-04T12:14:46.597Z

---

### Overall Report Confidence
`██████████` **100%**
> Overall confidence across 5 sections. 131 total data points verified.

## Executive Summary
Audit of https://old.example-corp.com identified 18 findings across 5 categories. 13 require immediate attention. Estimated total remediation effort: 167 hours.
### Risk Assessment
**Overall Risk:** CRITICAL — Immediate action required
**Total Findings:** 18
**Top Action:** Address "Largest Contentful Paint (LCP) exceeds 4s" (The LCP element is a 4MB uncompressed JPEG hero image. Convert to WebP, implement responsive images with srcset, and add preload hints.)
**Estimated Timeline:** 1-2 months
### Findings by Severity
| Severity | Count |
| --- | --- |
| Critical | 5 |
| High | 8 |
| Medium | 5 |
### Findings by Category
| Category | Count |
| --- | --- |
| SEO | 3 |
| Accessibility | 4 |
| Performance | 6 |
| Security | 3 |
| Best Practice | 2 |
### Executive Section Confidence
`██████████` **100%**
> 5 data points verified

## Developer Report

18 findings grouped into 6 categories. Total estimated effort: 167 hours.

### Technical Debt

Significant technical debt detected. 3 issues require complex refactoring (~56 hours).

### Quick Wins

- Document does not have a meta description: Add unique meta descriptions to all pages.
- Uses HTTP/1.1 for some resources: Enable HTTP/2 or HTTP/3 on the server. Most modern servers support HTTP/2 with minimal configuration.
- Browser errors logged to the console: Fix all console errors. Implement error monitoring with Sentry or similar.

### Finding Groups

#### Performance — Performance (6 findings, max: Critical)

  - **Largest Contentful Paint (LCP) exceeds 4s** (Critical) — The LCP element is a 4MB uncompressed JPEG hero image. Convert to WebP, implement responsive images with srcset, and add preload hints.
  - **Total Blocking Time (TBT) exceeds 200ms** (Critical) — Main thread breakdown: Script evaluation (1800ms), Style calculation (400ms), Layout (200ms). Defer non-critical scripts and eliminate render-blocking JavaScript.
  - **Cumulative Layout Shift (CLS) exceeds 0.1** (High) — Set explicit width/height on images and embeds, use CSS aspect-ratio, and inject ad placeholders before ads load.
  - **Server response time (TTFB) exceeds 600ms** (Critical) — Server runs on shared hosting with no caching. Implement Redis caching, optimize database queries, and consider a CDN.
  - **Eliminate render-blocking resources** (High) — Inline critical CSS, defer non-critical resources, and load third-party scripts asynchronously.
  - **Unused CSS rules** (Medium) — Remove unused CSS or use critical CSS inlining. Consider PurgeCSS for automated dead code elimination.

#### Accessibility — Content (2 findings, max: Critical)

  - **Form elements do not have associated labels** (High) — Associate each form input with a <label> element using the for attribute or by wrapping the input in the label.
  - **Image elements do not have [alt] attributes** (Critical) — Add descriptive alt text to all informational images. Use alt='' for decorative images.

#### Security — Technical (3 findings, max: Critical)

  - **Missing X-Content-Type-Options header** (Medium) — Add X-Content-Type-Options: nosniff header to all responses.
  - **Mixed content detected** (Critical) — Update all resource URLs to HTTPS. Use protocol-relative URLs if needed for development environments.
  - **CSP header is missing** (High) — Implement a strict Content-Security-Policy header.

#### Accessibility — Technical (2 findings, max: High)

  - **Missing document language** (High) — Add lang='en' (or appropriate language code) to the <html> element.
  - **Elements with ARIA roles do not have required ARIA attributes** (Medium) — Add required ARIA attributes to all elements with explicit roles.

#### SEO — Metadata (3 findings, max: High)

  - **Document does not have a meta description** (High) — Add unique meta descriptions to all pages.
  - **Page does not have a valid hreflang** (Medium) — Ensure all hreflang links are bidirectional and point to valid URLs.
  - **Document does not have a valid rel=canonical** (Medium) — Add a rel=canonical tag pointing to the preferred URL for each page.

#### Best Practice — Technical (2 findings, max: High)

  - **Uses HTTP/1.1 for some resources** (High) — Enable HTTP/2 or HTTP/3 on the server. Most modern servers support HTTP/2 with minimal configuration.
  - **Browser errors logged to the console** (High) — Fix all console errors. Implement error monitoring with Sentry or similar.

### Developer Section Confidence
`██████████` **100%**
> 8 data points verified

## Business Summary

Total estimated effort: 166.9 hours ($25,035 at $150/hr). 18 findings with business impact assessments.

### Financial Overview

**Total Effort:** 166.9 hours
**Estimated Cost:** $25,035

### ROI

Addressing 13 high-impact issues first will reduce critical risk exposure. Estimated investment: $25,035 for 166.9 hours of work.

### Impact Summary

| Finding | Business Impact | Effort | Hours | Priority |
| --- | --- | --- | --- | --- |
| Largest Contentful Paint (LCP) exceeds 4s | Critical | Moderate | 10.4h | 80.0 |
| Total Blocking Time (TBT) exceeds 200ms | Critical | Moderate | 10.4h | 80.0 |
| Server response time (TTFB) exceeds 600ms | Critical | Moderate | 10.4h | 80.0 |
| Document does not have a meta description | High | Easy | 3.6h | 78.0 |
| Uses HTTP/1.1 for some resources | High | Easy | 4.5h | 78.0 |
| Browser errors logged to the console | High | Easy | 4.5h | 78.0 |
| Image elements do not have [alt] attributes | High | Moderate | 12h | 70.0 |
| Cumulative Layout Shift (CLS) exceeds 0.1 | High | Moderate | 7.8h | 60.0 |
| Eliminate render-blocking resources | High | Moderate | 7.8h | 60.0 |
| Form elements do not have associated labels | High | Moderate | 9h | 60.0 |
| Mixed content detected | Critical | Difficult | 24h | 56.0 |
| Page does not have a valid hreflang | Medium | Easy | 2.4h | 52.0 |
| Document does not have a valid rel=canonical | Medium | Easy | 2.4h | 52.0 |
| Missing document language | High | Difficult | 13.5h | 42.0 |
| CSP header is missing | High | Difficult | 18h | 42.0 |
| Unused CSS rules | Medium | Moderate | 5.2h | 40.0 |
| Elements with ARIA roles do not have required ARIA attributes | Medium | Moderate | 9h | 40.0 |
| Missing X-Content-Type-Options header | Medium | Moderate | 12h | 40.0 |

### Business Section Confidence
`██████████` **100%**
> 36 data points verified

## Implementation Roadmap

3 phases planned over 2-3 months. Total effort: 166.9 hours.

**Total Estimated Hours:** 166.9
**Overall Timeline:** 2-3 months

### Phase 1: Critical Fixes

*1-3 days* — Address all critical severity issues immediately

**Phase effort:** 67.2 hours

  - **Largest Contentful Paint (LCP) exceeds 4s** (Moderate, 10.4h) — The LCP element is a 4MB uncompressed JPEG hero image. Convert to WebP, implement responsive images with srcset, and add preload hints.
    - Identify affected performance in codebase
    - Apply fix: The LCP element is a 4MB uncompressed JPEG hero image. Convert to WebP, implement responsive images with srcset, and add preload hints.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Total Blocking Time (TBT) exceeds 200ms** (Moderate, 10.4h) — Main thread breakdown: Script evaluation (1800ms), Style calculation (400ms), Layout (200ms). Defer non-critical scripts and eliminate render-blocking JavaScript.
    - Identify affected performance in codebase
    - Apply fix: Main thread breakdown: Script evaluation (1800ms), Style calculation (400ms), Layout (200ms). Defer non-critical scripts and eliminate render-blocking JavaScript.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Server response time (TTFB) exceeds 600ms** (Moderate, 10.4h) — Server runs on shared hosting with no caching. Implement Redis caching, optimize database queries, and consider a CDN.
    - Identify affected performance in codebase
    - Apply fix: Server runs on shared hosting with no caching. Implement Redis caching, optimize database queries, and consider a CDN.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Image elements do not have [alt] attributes** (Moderate, 12h) — Add descriptive alt text to all informational images. Use alt='' for decorative images.
    - Identify affected content in codebase
    - Apply fix: Add descriptive alt text to all informational images. Use alt='' for decorative images.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Mixed content detected** (Difficult, 24h) — Update all resource URLs to HTTPS. Use protocol-relative URLs if needed for development environments.
    - Identify affected technical in codebase
    - Apply fix: Update all resource URLs to HTTPS. Use protocol-relative URLs if needed for development environments.
    - Test fix in staging environment
    - Verify with automated audit tools

### Phase 2: High Priority

*1-2 weeks* — Resolve high severity issues

**Phase effort:** 68.7 hours

  - **Document does not have a meta description** (Easy, 3.6h) — Add unique meta descriptions to all pages.
    - Identify affected metadata in codebase
    - Apply fix: Add unique meta descriptions to all pages.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Uses HTTP/1.1 for some resources** (Easy, 4.5h) — Enable HTTP/2 or HTTP/3 on the server. Most modern servers support HTTP/2 with minimal configuration.
    - Identify affected technical in codebase
    - Apply fix: Enable HTTP/2 or HTTP/3 on the server. Most modern servers support HTTP/2 with minimal configuration.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Browser errors logged to the console** (Easy, 4.5h) — Fix all console errors. Implement error monitoring with Sentry or similar.
    - Identify affected technical in codebase
    - Apply fix: Fix all console errors. Implement error monitoring with Sentry or similar.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Cumulative Layout Shift (CLS) exceeds 0.1** (Moderate, 7.8h) — Set explicit width/height on images and embeds, use CSS aspect-ratio, and inject ad placeholders before ads load.
    - Identify affected performance in codebase
    - Apply fix: Set explicit width/height on images and embeds, use CSS aspect-ratio, and inject ad placeholders before ads load.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Eliminate render-blocking resources** (Moderate, 7.8h) — Inline critical CSS, defer non-critical resources, and load third-party scripts asynchronously.
    - Identify affected performance in codebase
    - Apply fix: Inline critical CSS, defer non-critical resources, and load third-party scripts asynchronously.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Form elements do not have associated labels** (Moderate, 9h) — Associate each form input with a <label> element using the for attribute or by wrapping the input in the label.
    - Identify affected content in codebase
    - Apply fix: Associate each form input with a <label> element using the for attribute or by wrapping the input in the label.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Missing document language** (Difficult, 13.5h) — Add lang='en' (or appropriate language code) to the <html> element.
    - Identify affected technical in codebase
    - Apply fix: Add lang='en' (or appropriate language code) to the <html> element.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **CSP header is missing** (Difficult, 18h) — Implement a strict Content-Security-Policy header.
    - Identify affected technical in codebase
    - Apply fix: Implement a strict Content-Security-Policy header.
    - Test fix in staging environment
    - Verify with automated audit tools

### Phase 3: Medium Priority

*2-4 weeks* — Address moderate severity improvements

**Phase effort:** 31 hours

  - **Page does not have a valid hreflang** (Easy, 2.4h) — Ensure all hreflang links are bidirectional and point to valid URLs.
    - Identify affected metadata in codebase
    - Apply fix: Ensure all hreflang links are bidirectional and point to valid URLs.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Document does not have a valid rel=canonical** (Easy, 2.4h) — Add a rel=canonical tag pointing to the preferred URL for each page.
    - Identify affected metadata in codebase
    - Apply fix: Add a rel=canonical tag pointing to the preferred URL for each page.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Unused CSS rules** (Moderate, 5.2h) — Remove unused CSS or use critical CSS inlining. Consider PurgeCSS for automated dead code elimination.
    - Identify affected performance in codebase
    - Apply fix: Remove unused CSS or use critical CSS inlining. Consider PurgeCSS for automated dead code elimination.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Elements with ARIA roles do not have required ARIA attributes** (Moderate, 9h) — Add required ARIA attributes to all elements with explicit roles.
    - Identify affected technical in codebase
    - Apply fix: Add required ARIA attributes to all elements with explicit roles.
    - Test fix in staging environment
    - Verify with automated audit tools
  - **Missing X-Content-Type-Options header** (Moderate, 12h) — Add X-Content-Type-Options: nosniff header to all responses.
    - Identify affected technical in codebase
    - Apply fix: Add X-Content-Type-Options: nosniff header to all responses.
    - Test fix in staging environment
    - Verify with automated audit tools

### Roadmap Section Confidence
`██████████` **100%**
> 18 data points verified

---

*Report generated by ReplexAgent Report Agent*
*Confidence: 100% — Overall confidence across 5 sections. 131 total data points verified.*