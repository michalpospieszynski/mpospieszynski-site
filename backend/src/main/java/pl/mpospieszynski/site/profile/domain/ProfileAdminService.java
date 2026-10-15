package pl.mpospieszynski.site.profile.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.AdminProfile;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.AvailabilitySettings;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.ProfileInput;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.ProfileTexts;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.SocialLinks;
import pl.mpospieszynski.site.profile.infra.SiteSettingsRepository;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;
import pl.mpospieszynski.site.shared.web.ConflictException;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * The settings screen (docs/screens/admin/10-settings.md). English is optional as a whole; once any English text
 * is filled, the English headline, intro and auto-reply are required, so English visitors never get Polish mail.
 */
@Service
public class ProfileAdminService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    static final UUID SETTINGS_ROW = new UUID(0, 1);

    private final SiteSettingsRepository settings;
    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final ApplicationEventPublisher events;

    public ProfileAdminService(SiteSettingsRepository settings, JdbcClient jdbc, JsonMapper json,
                               ApplicationEventPublisher events) {
        this.settings = settings;
        this.jdbc = jdbc;
        this.json = json;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public AdminProfile get() {
        return view(load());
    }

    @Transactional
    public AdminProfile save(ProfileInput in) {
        SiteSettings s = load();
        if (s.version() != in.version()) {
            throw new ConflictException("admin.errors.staleVersion");
        }
        List<FieldProblem> problems = new ArrayList<>();
        if (blank(in.fullName())) {
            problems.add(new FieldProblem("fullName", "admin.errors.required"));
        }
        ProfileTexts pl = in.translations() == null ? null : in.translations().pl();
        ProfileTexts en = in.translations() == null ? null : in.translations().en();
        requireTexts(problems, "pl", pl, "admin.errors.required");
        if (en != null && allBlank(en)) {
            en = null;
        }
        if (en != null) {
            requireTexts(problems, "en", en, "admin.errors.enRequired");
        }
        SocialLinks links = in.socialLinks() == null ? new SocialLinks(null, null, null) : in.socialLinks();
        checkUrl(problems, "socialLinks.github", links.github());
        checkUrl(problems, "socialLinks.linkedin", links.linkedin());
        if (!blank(links.email()) && !EMAIL.matcher(links.email().strip()).matches()) {
            problems.add(new FieldProblem("socialLinks.email", "admin.errors.email"));
        }
        checkExists(problems, "portraitMediaId", "media", in.portraitMediaId());
        checkExists(problems, "siteProjectId", "project", in.siteProjectId());
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        AvailabilitySettings availability = in.availability() == null
                ? new AvailabilitySettings(SiteSettings.Availability.OPEN, null, false) : in.availability();
        s.edit(in.fullName().strip(),
                availability.status() == null ? SiteSettings.Availability.OPEN : availability.status(),
                availability.from(), availability.visible(), socialLinksJson(links), in.portraitMediaId(),
                in.siteProjectId(), new SiteSettingsText(pl), en == null ? null : new SiteSettingsText(en));
        SiteSettings saved = settings.saveAndFlush(s);
        events.publishEvent(new ContentChangedEvent("profile"));
        return view(saved);
    }

    /** For the dashboard. */
    @Transactional(readOnly = true)
    public AvailabilitySettings availability() {
        SiteSettings s = load();
        return new AvailabilitySettings(s.availability(), s.availableFrom(), s.showAvailability());
    }

    @Transactional(readOnly = true)
    public List<TranslationGap> translationGaps() {
        SiteSettings s = load();
        TranslationStatus status = status(s);
        return status == TranslationStatus.COMPLETE ? List.of()
                : List.of(new TranslationGap(TranslationGap.Type.SETTINGS, SETTINGS_ROW, s.fullName(), status));
    }

    /** The owner's name, for test mail. */
    @Transactional(readOnly = true)
    public String fullName() {
        return load().fullName();
    }

    private SiteSettings load() {
        return settings.findById(SiteSettingsRepository.SETTINGS_ID).orElseThrow(NotFoundException::new);
    }

    private static void requireTexts(List<FieldProblem> problems, String locale, ProfileTexts t, String key) {
        String prefix = "translations." + locale + ".";
        if (t == null || blank(t.headline())) {
            problems.add(new FieldProblem(prefix + "headline", key));
        }
        if (t == null || blank(t.introMd())) {
            problems.add(new FieldProblem(prefix + "introMd", key));
        }
        if (t == null || blank(t.autoreplySubject())) {
            problems.add(new FieldProblem(prefix + "autoreplySubject", key));
        }
        if (t == null || blank(t.autoreplyBodyMd())) {
            problems.add(new FieldProblem(prefix + "autoreplyBodyMd", key));
        }
    }

    private void checkExists(List<FieldProblem> problems, String field, String table, UUID id) {
        if (id == null) {
            return;
        }
        String sql = switch (table) {
            case "media" -> "select exists (select 1 from media where id = :id)";
            case "project" -> "select exists (select 1 from project where id = :id)";
            default -> throw new IllegalArgumentException(table);
        };
        if (!jdbc.sql(sql).param("id", id).query(Boolean.class).single()) {
            problems.add(new FieldProblem(field, "admin.errors.unknownReference"));
        }
    }

    private static void checkUrl(List<FieldProblem> problems, String field, String url) {
        if (!blank(url) && !url.strip().startsWith("https://")) {
            problems.add(new FieldProblem(field, "admin.errors.url"));
        }
    }

    private String socialLinksJson(SocialLinks links) {
        Map<String, String> map = new LinkedHashMap<>();
        put(map, "github", links.github());
        put(map, "linkedin", links.linkedin());
        put(map, "email", links.email());
        return json.writeValueAsString(map);
    }

    private static void put(Map<String, String> map, String key, String value) {
        if (!blank(value)) {
            map.put(key, value.strip());
        }
    }

    private AdminProfile view(SiteSettings s) {
        Map<String, String> links = s.socialLinksJson() == null || s.socialLinksJson().isBlank() ? Map.of()
                : json.readValue(s.socialLinksJson(), new TypeReference<Map<String, String>>() { });
        SiteSettingsText pl = s.translations().get("pl");
        SiteSettingsText en = s.translations().get("en");
        return new AdminProfile(s.version(), s.fullName(),
                new AvailabilitySettings(s.availability(), s.availableFrom(), s.showAvailability()),
                new SocialLinks(links.get("github"), links.get("linkedin"), links.get("email")),
                s.portraitMediaId(), s.siteProjectId(), status(s),
                new ProfileAdmin.ProfileTranslations(pl == null ? null : pl.toTexts(), en == null ? null : en.toTexts()));
    }

    private static TranslationStatus status(SiteSettings s) {
        SiteSettingsText pl = s.translations().get("pl");
        SiteSettingsText en = s.translations().get("en");
        return pl == null ? TranslationStatus.MISSING
                : TranslationStatus.of(fields(pl.toTexts()), en == null ? null : fields(en.toTexts()));
    }

    private static List<String> fields(ProfileTexts t) {
        return Arrays.asList(t.headline(), t.introMd(), t.aboutMd(), t.approachMd(), t.locationLabel(),
                t.autoreplySubject(), t.autoreplyBodyMd());
    }

    private static boolean allBlank(ProfileTexts t) {
        return fields(t).stream().allMatch(ProfileAdminService::blank);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
