package pl.mpospieszynski.site.media.domain;

import java.util.List;
import java.util.UUID;

/** What the admin media library exchanges (docs/screens/admin/09-media.md). */
public final class MediaAdmin {

    private MediaAdmin() {
    }

    public record MediaTexts(String altText, String caption) {
    }

    public record MediaTranslations(MediaTexts pl, MediaTexts en) {
    }

    public record AdminMedia(UUID id, long version, String url, String originalName, String mimeType, Integer width,
                             Integer height, long sizeBytes, long usageCount, MediaTranslations translations) {
    }

    public record MediaPage(List<AdminMedia> items, long total, int page, int size) {
    }

    public record MediaInput(long version, MediaTranslations translations) {
    }

    /** Where a file is used; `role` is cover, gallery, portrait or text. */
    public record MediaUsage(String type, UUID id, String label, String role) {
    }
}
