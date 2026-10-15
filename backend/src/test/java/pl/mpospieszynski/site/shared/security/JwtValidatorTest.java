package pl.mpospieszynski.site.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

class JwtValidatorTest {

    private static final String ISSUER = "https://project.supabase.co/auth/v1";

    private final OAuth2TokenValidator<Jwt> validator = SecurityConfig.jwtValidator(
            new SiteSecurityProperties(URI.create(ISSUER + "/.well-known/jwks.json"), ISSUER, "authenticated"));

    @Test
    void acceptsAValidSupabaseToken() {
        assertThat(validator.validate(jwt(ISSUER, List.of("authenticated"), Instant.now().plusSeconds(300))).hasErrors())
                .isFalse();
    }

    @Test
    void rejectsAnotherIssuer() {
        assertThat(validator.validate(jwt("https://other.supabase.co/auth/v1", List.of("authenticated"), Instant.now().plusSeconds(300))).hasErrors())
                .isTrue();
    }

    @Test
    void rejectsTheAnonymousAudience() {
        assertThat(validator.validate(jwt(ISSUER, List.of("anon"), Instant.now().plusSeconds(300))).hasErrors())
                .isTrue();
    }

    @Test
    void rejectsAnExpiredToken() {
        assertThat(validator.validate(jwt(ISSUER, List.of("authenticated"), Instant.now().minusSeconds(3600))).hasErrors())
                .isTrue();
    }

    private static Jwt jwt(String issuer, List<String> audience, Instant expiresAt) {
        return Jwt.withTokenValue("token")
                .header("alg", "ES256")
                .issuer(issuer)
                .audience(audience)
                .issuedAt(expiresAt.minusSeconds(3600))
                .expiresAt(expiresAt)
                .build();
    }
}
