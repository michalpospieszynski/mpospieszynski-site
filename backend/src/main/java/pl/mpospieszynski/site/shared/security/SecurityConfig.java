package pl.mpospieszynski.site.shared.security;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

/**
 * Stateless bearer-token security (docs/ARCHITECTURE.md §5). Public reads, the contact form, media and SEO
 * files are open; /api/v1/admin/** needs ROLE_ADMIN from a Supabase JWT; everything else is denied.
 */
@Configuration
@EnableMethodSecurity
class SecurityConfig {

    /** No browser feature is needed by JSON or images; the same list as the SSR server sends. */
    static final String PERMISSIONS_POLICY =
            "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()";

    /**
     * The API serves JSON and images only, so nothing in a response may run or be framed (this also neutralises
     * scripts in an SVG opened directly from /media). HSTS comes from Cloudflare (docs/ARCHITECTURE.md §12).
     */
    private static final String CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

    @Bean
    SecurityFilterChain api(HttpSecurity http, SupabaseJwtConverter converter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable) // bearer tokens only, no cookies
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY))
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY)))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/**", "/media/**", "/sitemap.xml", "/robots.txt").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/public/contact").permitAll()
                        .requestMatchers("/api/actuator/health/**").permitAll()
                        // The OpenAPI spec exists only where springdoc is enabled (not in production).
                        .requestMatchers(HttpMethod.GET, "/api/v3/api-docs", "/api/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(SiteSecurityProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.jwkSetUri().toString())
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.ES256);
                    algorithms.add(SignatureAlgorithm.RS256);
                })
                .build();
        decoder.setJwtValidator(jwtValidator(properties));
        return decoder;
    }

    /** Expiry, issuer and the `authenticated` audience Supabase puts on signed-in users' tokens. */
    static OAuth2TokenValidator<Jwt> jwtValidator(SiteSecurityProperties properties) {
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(properties.jwtIssuer()),
                new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains(properties.jwtAudience())));
    }
}
