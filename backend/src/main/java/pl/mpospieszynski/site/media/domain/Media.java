package pl.mpospieszynski.site.media.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** An uploaded image with alt text and caption per language (docs/screens/admin/09-media.md). */
@Entity
@Table(name = "media")
public class Media {

    @Embeddable
    public static class Text {

        @Column(name = "alt_text", nullable = false)
        private String altText;

        private String caption;

        protected Text() {
        }

        public Text(String altText, String caption) {
            this.altText = altText.strip();
            this.caption = caption == null || caption.isBlank() ? null : caption.strip();
        }

        public MediaAdmin.MediaTexts toTexts() {
            return new MediaAdmin.MediaTexts(altText, caption);
        }
    }

    @Id
    private UUID id;

    @Column(nullable = false)
    private String storageKey;

    @Column(nullable = false)
    private String mimeType;

    private Integer width;

    private Integer height;

    @Column(nullable = false)
    private long sizeBytes;

    private String originalName;

    @Column(insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Version
    private long version;

    /** No row for a language without alt text yet. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "media_translation", joinColumns = @JoinColumn(name = "media_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, Text> translations = new HashMap<>();

    protected Media() {
    }

    public Media(UUID id, String storageKey, String mimeType, int width, int height, long sizeBytes, String originalName) {
        this.id = id;
        this.storageKey = storageKey;
        this.mimeType = mimeType;
        this.width = width;
        this.height = height;
        this.sizeBytes = sizeBytes;
        this.originalName = originalName;
    }

    public void setText(String locale, Text text) {
        if (text == null) {
            translations.remove(locale);
        } else {
            translations.put(locale, text);
        }
    }

    public UUID id() {
        return id;
    }

    public String storageKey() {
        return storageKey;
    }

    public String mimeType() {
        return mimeType;
    }

    public Integer width() {
        return width;
    }

    public Integer height() {
        return height;
    }

    public long sizeBytes() {
        return sizeBytes;
    }

    public String originalName() {
        return originalName;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public long version() {
        return version;
    }

    public Text text(String locale) {
        return translations.get(locale);
    }
}
