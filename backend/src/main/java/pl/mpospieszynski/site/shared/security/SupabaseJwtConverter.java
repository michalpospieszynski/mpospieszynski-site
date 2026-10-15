package pl.mpospieszynski.site.shared.security;

import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Maps a Supabase access token to an authentication. Only `app_metadata.role = "admin"` grants ROLE_ADMIN;
 * app_metadata can be written only with the service role, so a user cannot grant it to themselves.
 */
@Component
public class SupabaseJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
        boolean admin = appMetadata != null && "admin".equals(appMetadata.get("role"));
        List<GrantedAuthority> authorities = admin ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN")) : List.of();
        return new JwtAuthenticationToken(jwt, authorities, jwt.getClaimAsString("email"));
    }
}
