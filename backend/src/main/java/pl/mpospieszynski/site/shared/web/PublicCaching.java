package pl.mpospieszynski.site.shared.web;

import java.time.Duration;
import org.springframework.http.CacheControl;

/** HTTP caching of public reads (docs/ARCHITECTURE.md §10). */
public final class PublicCaching {

    /** Public GETs are cacheable for a minute and may be served stale for ten while revalidating. */
    public static final CacheControl READ = CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic()
            .staleWhileRevalidate(Duration.ofMinutes(10));

    private PublicCaching() {
    }
}
