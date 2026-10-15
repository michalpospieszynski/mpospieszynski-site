package pl.mpospieszynski.site.shared.storage;

import java.net.URI;
import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * `site.storage.*`: `type` is `supabase` (production) or `local` (dev profile). The publishable key is the
 * public "anon" key, safe in the browser; writes are authorised by the admin's JWT and the bucket policy.
 */
@ConfigurationProperties("site.storage")
public record StorageProperties(String type, URI supabaseUrl, String bucket, String publishableKey, Path localDir) {

    public boolean local() {
        return "local".equalsIgnoreCase(type);
    }
}
