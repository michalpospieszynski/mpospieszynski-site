package pl.mpospieszynski.site.media.domain;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.media.domain.MediaAdmin.AdminMedia;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaInput;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaPage;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaTexts;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaUsage;
import pl.mpospieszynski.site.media.infra.MediaRepository;
import pl.mpospieszynski.site.media.infra.MediaUsageQueries;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;
import pl.mpospieszynski.site.shared.security.CurrentAdmin;
import pl.mpospieszynski.site.shared.storage.MediaRef;
import pl.mpospieszynski.site.shared.storage.MediaStorage;
import pl.mpospieszynski.site.shared.web.ConflictException;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;

/**
 * The media library (docs/screens/admin/09-media.md): JPG, PNG and WebP up to 5 MB, type sniffed from the bytes
 * (never the name or the browser's claim; SVG is refused), dimensions read with ImageIO, stored as `<uuid>.<ext>`
 * through {@link MediaStorage} with the admin's own token.
 */
@Service
public class MediaAdminService {

    static final long MAX_BYTES = 5L * 1024 * 1024;

    private final MediaRepository media;
    private final MediaUsageQueries usages;
    private final MediaStorage storage;
    private final ApplicationEventPublisher events;

    public MediaAdminService(MediaRepository media, MediaUsageQueries usages, MediaStorage storage,
                             ApplicationEventPublisher events) {
        this.media = media;
        this.usages = usages;
        this.storage = storage;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public MediaPage list(String q, int page, int size) {
        int pageSize = Math.clamp(size, 1, 100);
        Page<Media> result = media.search(q == null ? "" : q.strip(), PageRequest.of(Math.max(page, 0), pageSize));
        return new MediaPage(result.map(this::view).toList(), result.getTotalElements(), result.getNumber(), pageSize);
    }

    @Transactional(readOnly = true)
    public AdminMedia get(UUID id) {
        return view(find(id));
    }

    @Transactional
    public AdminMedia upload(byte[] bytes, String originalName) {
        if (bytes.length > MAX_BYTES) {
            throw new ValidationException("admin.media.size", List.of(new FieldProblem("file", "admin.media.size")));
        }
        ImageType type = ImageType.sniff(bytes);
        if (type == null) {
            throw new ValidationException("admin.media.type", List.of(new FieldProblem("file", "admin.media.type")));
        }
        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            image = null;
        }
        if (image == null) {
            throw new ValidationException("admin.media.unreadable", List.of(new FieldProblem("file", "admin.media.unreadable")));
        }
        UUID id = UUID.randomUUID();
        String key = id + "." + type.extension;
        storage.put(key, bytes, type.mediaType, CurrentAdmin.accessToken());
        Media saved = media.saveAndFlush(new Media(id, key, type.mediaType.toString(), image.getWidth(), image.getHeight(),
                bytes.length, originalName == null ? null : originalName.strip()));
        return view(saved);
    }

    @Transactional
    public AdminMedia save(UUID id, MediaInput in) {
        Media item = find(id);
        if (item.version() != in.version()) {
            throw new ConflictException("admin.errors.staleVersion");
        }
        List<FieldProblem> problems = new ArrayList<>();
        Media.Text pl = text(problems, "pl", in.translations() == null ? null : in.translations().pl());
        Media.Text en = text(problems, "en", in.translations() == null ? null : in.translations().en());
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        item.setText("pl", pl);
        item.setText("en", en);
        AdminMedia view = view(media.saveAndFlush(item));
        events.publishEvent(new ContentChangedEvent("media"));
        return view;
    }

    @Transactional(readOnly = true)
    public List<MediaUsage> usages(UUID id) {
        Media item = find(id);
        return usages.usages(item.id(), item.storageKey()).stream()
                .map(u -> new MediaUsage(u.type(), u.id(), u.label(), u.role())).toList();
    }

    /** 409 while the file is used anywhere; the stored object is removed with the row. */
    @Transactional
    public void delete(UUID id) {
        Media item = find(id);
        if (!usages.usages(item.id(), item.storageKey()).isEmpty()) {
            throw new ConflictException("admin.media.inUse");
        }
        media.delete(item);
        media.flush();
        storage.delete(item.storageKey(), CurrentAdmin.accessToken());
    }

    /** Used images without English alt text (dashboard). */
    @Transactional(readOnly = true)
    public List<TranslationGap> translationGaps() {
        List<TranslationGap> gaps = new ArrayList<>();
        for (Media item : media.findAll()) {
            if (item.text("en") == null && !usages.usages(item.id(), item.storageKey()).isEmpty()) {
                String label = item.originalName() == null ? item.storageKey() : item.originalName();
                gaps.add(new TranslationGap(TranslationGap.Type.MEDIA, item.id(), label, TranslationStatus.MISSING));
            }
        }
        return gaps;
    }

    private static Media.Text text(List<FieldProblem> problems, String locale, MediaTexts t) {
        if (t == null || (blank(t.altText()) && blank(t.caption()))) {
            return null;
        }
        if (blank(t.altText())) {
            problems.add(new FieldProblem("translations." + locale + ".altText", "admin.errors.required"));
            return null;
        }
        return new Media.Text(t.altText(), t.caption());
    }

    private Media find(UUID id) {
        return media.findById(id).orElseThrow(NotFoundException::new);
    }

    private AdminMedia view(Media m) {
        Media.Text pl = m.text("pl");
        Media.Text en = m.text("en");
        return new AdminMedia(m.id(), m.version(), MediaRef.urlFor(m.storageKey()), m.originalName(), m.mimeType(),
                m.width(), m.height(), m.sizeBytes(), usages.usages(m.id(), m.storageKey()).size(),
                new MediaAdmin.MediaTranslations(pl == null ? null : pl.toTexts(), en == null ? null : en.toTexts()));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    /** The accepted formats, recognised by their first bytes. */
    enum ImageType {
        JPEG(MediaType.IMAGE_JPEG, "jpg"),
        PNG(MediaType.IMAGE_PNG, "png"),
        WEBP(MediaType.parseMediaType("image/webp"), "webp");

        final MediaType mediaType;
        final String extension;

        ImageType(MediaType mediaType, String extension) {
            this.mediaType = mediaType;
            this.extension = extension;
        }

        static ImageType sniff(byte[] b) {
            if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
                return JPEG;
            }
            if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
                return PNG;
            }
            if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                    && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
                return WEBP;
            }
            return null;
        }
    }
}
