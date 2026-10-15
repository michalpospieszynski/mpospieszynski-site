package pl.mpospieszynski.site.shared.storage;

import io.swagger.v3.oas.annotations.Hidden;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves files at https://mpospieszynski.pl/media/{key} (docs/ARCHITECTURE.md §4, Media through your own domain).
 * Keys never change for a given file, so responses are cached for a year at Cloudflare and in browsers.
 */
@Hidden
@RestController
class MediaController {

    static final String MEDIA_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

    private static final CacheControl IMMUTABLE = CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    private final MediaStorage storage;

    MediaController(MediaStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/media/{key}")
    ResponseEntity<byte[]> media(@PathVariable String key) {
        if (!MediaStorage.KEY.matcher(key).matches() || key.contains("..")) {
            return ResponseEntity.notFound().build();
        }
        return storage.get(key)
                .map(object -> ResponseEntity.ok()
                        .contentType(object.contentType())
                        .cacheControl(IMMUTABLE)
                        .header("X-Content-Type-Options", "nosniff")
                        // An uploaded SVG opened directly must not run script on the site's origin; <img> is unaffected.
                        .header("Content-Security-Policy", MEDIA_CSP)
                        .body(object.content()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
