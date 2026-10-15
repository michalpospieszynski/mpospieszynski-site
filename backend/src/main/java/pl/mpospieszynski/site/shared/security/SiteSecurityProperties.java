package pl.mpospieszynski.site.shared.security;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Supabase Auth settings used to validate admin JWTs (docs/ARCHITECTURE.md §5, Security configuration). */
@ConfigurationProperties("site.security")
public record SiteSecurityProperties(URI jwkSetUri, String jwtIssuer, String jwtAudience) {
}
