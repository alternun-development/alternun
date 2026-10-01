# Public domain redirects

## Routing

| Source (HTTP and HTTPS) | Destination                | Response |
| ----------------------- | -------------------------- | -------- |
| `air.alternun.co`       | `https://airs.alternun.co` | 308      |
| `alternun.co`           | `https://alternun.io`      | 308      |

Paths, encoded query values, and repeated query parameters are preserved.
CloudFront may reorder query parameter names. HTTP redirects directly to the HTTPS
destination. The HTTPS source names have a valid ACM certificate in `us-east-1`.

## September 30, 2026 repair

Both sources lacked web DNS records. The existing root redirect distribution had
no domain alias and its previous certificate had expired on September 17.

The repair restored the root distribution `E2EXT1ID9I3ZAI` and created the AIRS
redirect distribution `E2PKQ5423GDIH7`, with the function
`alternun-air-https-redirect`. Route53 A and AAAA aliases point each source at its
distribution. Both distributions use a replacement DNS-validated certificate
covering `alternun.co` and `air.alternun.co`. Keep both ACM validation CNAMEs
permanently published for automatic renewal.

This was an AWS API operational repair, not a full application deployment.
The root redirect remains owned by the existing dev SST stack. The private local
`INFRA_REDIRECT_ROOT_CERT_ARN` override was updated to the replacement certificate.
Before a future dev deployment, ensure its CI certificate override references the
current attached certificate, and review the preview for certificate replacement.
Do not copy private environment values or certificate ARNs into this document.

The AIRS typo redirect is currently managed directly in AWS, outside SST state.
If bringing it into IaC, import its existing distribution and function; do not
create another distribution claiming the same alias. Do not remove either ACM
validation record during migration or cleanup.

## Verification

On September 30, both distributions reached `Deployed`, Route53 reported `INSYNC`,
and public HTTP and HTTPS requests returned the expected 308 destinations for both
hosts. Strict TLS verification passed. An encoded query value and repeated query
parameters survived both redirects. ACM reported `ISSUED`, both validations
`SUCCESS`, and renewal `ELIGIBLE`; the replacement expires April 15, 2027 at
23:59:59 UTC.

Check both HTTP and HTTPS without disabling certificate verification:

```bash
curl -I 'http://air.alternun.co/example?tag=one&tag=two'
curl -I 'https://air.alternun.co/example?tag=one&tag=two'
curl -I 'http://alternun.co/example?tag=one&tag=two'
curl -I 'https://alternun.co/example?tag=one&tag=two'
```

Expect 308 and a Location with the corresponding destination hostname, path, and
query values. For certificate health, run the existing TLS checker with these
hosts explicitly. Use authenticated `--acm` checks to verify renewal eligibility
and public validation CNAMEs as well.
