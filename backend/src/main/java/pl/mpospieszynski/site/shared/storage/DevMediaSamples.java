package pl.mpospieszynski.site.shared.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Component;

/**
 * Dev profile only: puts the images referenced by the sample content (db/dev) into the media storage, so
 * covers and galleries show up locally (local disk storage only). Files that already exist are left alone.
 */
@Component
@Profile("dev")
class DevMediaSamples implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevMediaSamples.class);

    private final MediaStorage storage;

    DevMediaSamples(MediaStorage storage) {
        this.storage = storage;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!(storage instanceof LocalDiskStorage)) {
            return; // Supabase Storage needs the admin's token for writes; samples are for the local folder only.
        }
        try {
            for (Resource sample : new PathMatchingResourcePatternResolver().getResources("classpath:dev-media/*")) {
                String key = sample.getFilename();
                if (key == null || storage.get(key).isPresent()) {
                    continue;
                }
                MediaType type = MediaTypeFactory.getMediaType(key).orElse(MediaType.APPLICATION_OCTET_STREAM);
                storage.put(key, sample.getContentAsByteArray(), type, null);
                log.info("Stored sample media {}", key);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
