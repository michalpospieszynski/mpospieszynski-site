package pl.mpospieszynski.site.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class SupabaseJwtConverterTest {

    private final SupabaseJwtConverter converter = new SupabaseJwtConverter();

    @Test
    void grantsAdminOnlyForAppMetadataRoleAdmin() {
        AbstractAuthenticationToken auth = converter.convert(jwt(Map.of("role", "admin")));

        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_ADMIN");
        assertThat(auth.getName()).isEqualTo("owner@example.com");
    }

    @Test
    void grantsNothingToOtherUsers() {
        assertThat(converter.convert(jwt(Map.of("role", "editor"))).getAuthorities()).isEmpty();
        assertThat(converter.convert(jwt(Map.of("provider", "email"))).getAuthorities()).isEmpty();
        assertThat(converter.convert(jwt(null)).getAuthorities()).isEmpty();
    }

    @Test
    void ignoresARoleClaimOutsideAppMetadata() {
        // user_metadata is editable by the user, so a role there must not count.
        Jwt jwt = baseJwt().claim("user_metadata", Map.of("role", "admin")).claim("role", "admin").build();
        assertThat(converter.convert(jwt).getAuthorities()).isEmpty();
    }

    private static Jwt jwt(Map<String, Object> appMetadata) {
        Jwt.Builder builder = baseJwt();
        if (appMetadata != null) {
            builder.claim("app_metadata", appMetadata);
        }
        return builder.build();
    }

    private static Jwt.Builder baseJwt() {
        return Jwt.withTokenValue("token")
                .header("alg", "ES256")
                .subject("user-1")
                .claim("email", "owner@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300));
    }
}
